package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.wallet.AggregatorCommissionMath;
import com.hotclick.service.wallet.AggregatorCommissionMath.Resultado;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Motor del Modelo Agregador.
 *
 * Calcula comisiones según el plan de la empresa y acredita el saldo neto
 * al wallet del emprendedor de forma asíncrona, fuera de la TX del webhook.
 *
 * === GARANTÍAS DE RESILIENCIA ===
 *
 * [BUG-1 CORREGIDO] Idempotencia ante webhooks duplicados:
 *   DataIntegrityViolationException lanzada por WalletService.acreditarVenta
 *   (al fallar el unique index uq_wallet_tx_credito_por_pedido) se captura
 *   aquí como duplicado benigno. No va a la DLQ, no genera alerta.
 *
 * [BUG-2 CORREGIDO] Resiliencia ante fallos transitorios:
 *   Cualquier otro Exception se captura y persiste en hot_click_wallet_dlq_tb
 *   vía WalletDlqTxOps (REQUIRES_NEW). WalletReconciliacionScheduler reintenta.
 */
@Service
public class AggregatorService {

    private static final Logger log = LoggerFactory.getLogger(AggregatorService.class);

    /** Reserva contable estimada ONVO tarjeta (~3.9% + fijo amortizado). */
    @Value("${hotclick.comision.gateway.pct:4}")
    private int pctGateway;

    /** Fallback si la empresa no tiene plan: Emprendedor 8%. */
    @Value("${hotclick.comision.fallback.pct:8}")
    private BigDecimal pctFallback;

    /** Mínimo por pedido en plan EMPRENDEDOR (cubre US$0.35 ONVO en tickets chicos). */
    @Value("${hotclick.comision.emprendedor.min.crc:400}")
    private long minimoEmprendedorCrc;

    private final WalletService walletService;
    private final WalletDlqTxOps dlqTxOps;
    private final EmpresaRepository empresaRepo;

    public AggregatorService(WalletService walletService,
                             WalletDlqTxOps dlqTxOps,
                             EmpresaRepository empresaRepo) {
        this.walletService = walletService;
        this.dlqTxOps = dlqTxOps;
        this.empresaRepo = empresaRepo;
    }

    /**
     * Llamado desde PaymentService.confirmarPedido() después del COMMIT del pago.
     * Ejecuta en el pool taskExecutor (hilo separado, sin TX del llamador).
     */
    @Async("taskExecutor")
    public void acreditarVentaAsync(Pedido pedido) {
        Long empresaId = pedido.getEmpresaId();
        long bruto = pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0L;

        if (empresaId == null) {
            log.warn("[aggregator] Pedido {} sin empresa — no se acredita wallet", pedido.getId());
            return;
        }
        if (bruto <= 0) {
            log.warn("[aggregator] Pedido {} total ≤ 0 — no se acredita wallet", pedido.getId());
            return;
        }

        long costoEnvio = pedido.getCostoEnvio() != null ? pedido.getCostoEnvio() : 0L;
        Liquidacion liquidacion = liquidar(empresaId, bruto, costoEnvio);
        Resultado calc = liquidacion.detalle().resultado();
        long neto = liquidacion.neto();
        if (neto <= 0) {
            log.warn("[aggregator] Neto ≤ 0 pedido={} — revisar tasas de comisión", pedido.getId());
            return;
        }

        try {
            walletService.acreditarVenta(
                empresaId, neto, bruto, calc.comisionSaas(), calc.comisionGw(), pedido.getId());
            log.info("[aggregator] Venta acreditada pedido={} empresa={} bruto=₡{} envio=₡{} comSaas=₡{} comGw=₡{} neto=₡{}",
                pedido.getId(), empresaId, bruto, liquidacion.envio(), calc.comisionSaas(), calc.comisionGw(), neto);

        } catch (DataIntegrityViolationException dup) {
            log.info("[aggregator] Acreditación duplicada ignorada (constraint) — pedido={} empresa={}",
                pedido.getId(), empresaId);

        } catch (Exception e) {
            log.error("[aggregator] FALLO al acreditar pedido={} empresa={} neto=₡{} — encolando en DLQ: {}",
                pedido.getId(), empresaId, calc.neto(), e.getMessage());
            try {
                dlqTxOps.encolar(empresaId, pedido.getId(), bruto,
                    calc.comisionSaas(), calc.comisionGw(), neto, e.getMessage());
            } catch (Exception dlqEx) {
                log.error("[aggregator] CRÍTICO — No se pudo encolar en DLQ: pedido={} empresa={} neto=₡{}. "
                        + "REQUIERE RECONCILIACIÓN MANUAL. DLQ error: {}",
                    pedido.getId(), empresaId, neto, dlqEx.getMessage());
            }
        }
    }

    /** Comisión con los datos del plan que la explican (mínimo = 0 si el plan no lo aplica). */
    public record DetalleComision(String plan, BigDecimal porcentaje, long minimo, Resultado resultado) {}

    /** Lo que recibe el negocio por un pedido: {@code neto = productos - comisión + envío}. */
    public record Liquidacion(long envio, DetalleComision detalle, long neto) {}

    /** La comisión se cobra sobre los productos; el envío se le paga completo al negocio. */
    public Liquidacion liquidar(Long empresaId, long bruto, long costoEnvio) {
        long envio = Math.max(0L, Math.min(costoEnvio, bruto));
        DetalleComision detalle = detalleParaEmpresa(empresaId, bruto - envio);
        return new Liquidacion(envio, detalle, detalle.resultado().neto() + envio);
    }

    /** Mismo cálculo que acredita el wallet; solo lectura, para mostrarle al vendedor lo que va a recibir. */
    public DetalleComision detalleParaEmpresa(Long empresaId, long bruto) {
        Empresa empresa = empresaRepo.findByIdWithPlan(empresaId).orElse(null);
        Plan plan = empresa != null ? empresa.getPlan() : null;
        String nombrePlan = nombrePlan(empresa, plan);
        BigDecimal pct = plan != null && plan.getComisionPorcentaje() != null
            ? plan.getComisionPorcentaje()
            : pctFallback;
        boolean min = AggregatorCommissionMath.aplicaMinimoEmprendedor(nombrePlan);
        Resultado resultado = AggregatorCommissionMath.calcular(
            bruto, pct, min, minimoEmprendedorCrc, pctGateway);
        return new DetalleComision(nombrePlan, pct, min ? minimoEmprendedorCrc : 0, resultado);
    }

    private static String nombrePlan(Empresa empresa, Plan plan) {
        if (plan != null && plan.getNombre() != null) {
            return plan.getNombre();
        }
        if (empresa != null && empresa.getPlanSaas() != null) {
            return empresa.getPlanSaas();
        }
        return AggregatorCommissionMath.PLAN_EMPRENDEDOR;
    }
}
