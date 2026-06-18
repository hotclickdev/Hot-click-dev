package com.hotclick.service;

import com.hotclick.model.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Motor del Modelo Agregador.
 *
 * Calcula comisiones y acredita el saldo neto al wallet del emprendedor
 * de forma asíncrona, fuera de la transacción del webhook de pago.
 *
 * === GARANTÍAS DE RESILIENCIA ===
 *
 * [BUG-1 CORREGIDO] Idempotencia ante webhooks duplicados:
 *   DataIntegrityViolationException lanzada por WalletService.acreditarVenta
 *   (al fallar el unique index uq_wallet_tx_credito_por_pedido) se captura
 *   aquí como duplicado benigno. No va a la DLQ, no genera alerta.
 *
 * [BUG-2 CORREGIDO] Resiliencia ante fallos transitorios:
 *   Cualquier otro Exception (BD caída, timeout, OOM) se captura y persiste
 *   en hot_click_wallet_dlq_tb vía WalletDlqTxOps (REQUIRES_NEW).
 *   WalletReconciliacionScheduler reintenta con backoff exponencial.
 *   Si se agotan los reintentos, se genera un log.error CRÍTICO para
 *   intervención manual.
 */
@Service
public class AggregatorService {

    private static final Logger log = LoggerFactory.getLogger(AggregatorService.class);

    @Value("${hotclick.comision.saas.pct:2}")
    private int pctSaas;

    @Value("${hotclick.comision.gateway.pct:3}")
    private int pctGateway;

    private final WalletService  walletService;
    private final WalletDlqTxOps dlqTxOps;

    public AggregatorService(WalletService walletService, WalletDlqTxOps dlqTxOps) {
        this.walletService = walletService;
        this.dlqTxOps      = dlqTxOps;
    }

    /**
     * Llamado desde PaymentService.confirmarPedido() después del COMMIT del pago.
     * Ejecuta en el pool taskExecutor (hilo separado, sin TX del llamador).
     */
    @Async("taskExecutor")
    public void acreditarVentaAsync(Pedido pedido) {
        Long empresaId = pedido.getEmpresaId();
        long bruto     = pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0L;

        if (empresaId == null) {
            log.warn("[aggregator] Pedido {} sin empresa — no se acredita wallet", pedido.getId());
            return;
        }
        if (bruto <= 0) {
            log.warn("[aggregator] Pedido {} total ≤ 0 — no se acredita wallet", pedido.getId());
            return;
        }

        BigDecimal bdBruto = BigDecimal.valueOf(bruto);
        long comSaas = bdBruto.multiply(BigDecimal.valueOf(pctSaas))
                               .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                               .longValue();
        long comGw   = bdBruto.multiply(BigDecimal.valueOf(pctGateway))
                               .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                               .longValue();
        long neto    = bruto - comSaas - comGw;

        if (neto <= 0) {
            log.warn("[aggregator] Neto ≤ 0 pedido={} — revisar tasas de comisión", pedido.getId());
            return;
        }

        try {
            walletService.acreditarVenta(empresaId, neto, bruto, comSaas, comGw, pedido.getId());
            log.info("[aggregator] Venta acreditada pedido={} empresa={} bruto=₡{} comSaas=₡{} comGw=₡{} neto=₡{}",
                pedido.getId(), empresaId, bruto, comSaas, comGw, neto);

        } catch (DataIntegrityViolationException dup) {
            // El unique index uq_wallet_tx_credito_por_pedido detectó un webhook duplicado.
            // La acreditación original ya fue exitosa. No hacer nada, no encolear en DLQ.
            log.info("[aggregator] Acreditación duplicada ignorada (constraint) — pedido={} empresa={}",
                pedido.getId(), empresaId);

        } catch (Exception e) {
            // Fallo transitorio (BD caída, timeout de red, etc.) o error de lógica inesperado.
            // Se persiste en la DLQ para reintento automático con backoff.
            log.error("[aggregator] FALLO al acreditar pedido={} empresa={} neto=₡{} — encolando en DLQ: {}",
                pedido.getId(), empresaId, neto, e.getMessage());
            try {
                dlqTxOps.encolar(empresaId, pedido.getId(), bruto, comSaas, comGw, neto, e.getMessage());
            } catch (Exception dlqEx) {
                // Si hasta el encolamiento en DLQ falla (BD completamente caída),
                // el log.error es la última línea de defensa para alertas basadas en logs.
                log.error("[aggregator] CRÍTICO — No se pudo encolar en DLQ: pedido={} empresa={} neto=₡{}. " +
                    "REQUIERE RECONCILIACIÓN MANUAL. DLQ error: {}",
                    pedido.getId(), empresaId, neto, dlqEx.getMessage());
            }
        }
    }
}
