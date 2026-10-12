package com.hotclick.service.wallet;

import com.hotclick.model.MetodoCobro;
import com.hotclick.model.PayoutRequest;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Liquidaciones automáticas, independientes entre sí (decisión HOT_CLICK 12-oct-2026):
 * <ul>
 *   <li>CONTRA_ENTREGA: al día siguiente, las ventas cobradas contra entrega (pedido EFECTIVO),
 *       ya netas de comisión, menos devoluciones/ajustes negativos pendientes.</li>
 *   <li>TARJETA: quincenal o mensual (empresa.frecuencia_payout), el resto de ventas,
 *       menos lo negativo que la liquidación contra entrega no haya cubierto.</li>
 * </ul>
 * Cada movimiento queda marcado con la liquidación que lo cubrió (fk_id_payout_liquidacion),
 * así nada se paga dos veces. Nunca se liquida más que el saldo disponible.
 */
@Service
public class WalletLiquidacionService {

    private static final Logger log = LoggerFactory.getLogger(WalletLiquidacionService.class);
    private static final List<String> TIPOS = List.of(
        WalletTransaccion.CREDITO_VENTA, WalletTransaccion.DEVOLUCION, WalletTransaccion.AJUSTE_MANUAL);

    private final WalletTransaccionRepository txRepo;
    private final WalletRepository walletRepo;
    private final WalletPayoutRequestService payoutService;

    public WalletLiquidacionService(WalletTransaccionRepository txRepo, WalletRepository walletRepo,
                                    WalletPayoutRequestService payoutService) {
        this.txRepo = txRepo;
        this.walletRepo = walletRepo;
        this.payoutService = payoutService;
    }

    /** Liquida para una empresa los movimientos anteriores a {@code hasta}. Devuelve el payout o empty. */
    @Transactional
    public Optional<PayoutRequest> liquidar(Long empresaId, String tipoLiquidacion, LocalDateTime hasta) {
        boolean contraEntrega = PayoutRequest.LIQ_CONTRA_ENTREGA.equals(tipoLiquidacion);
        if (!contraEntrega && !PayoutRequest.LIQ_TARJETA.equals(tipoLiquidacion)) {
            throw new IllegalArgumentException("Tipo de liquidación inválido: " + tipoLiquidacion);
        }
        Optional<MetodoCobro> cuenta = payoutService.buscarCuentaVerificada(empresaId);
        if (cuenta.isEmpty()) {
            log.info("[liquidacion] empresa={} sin cuenta verificada; {} queda pendiente", empresaId, tipoLiquidacion);
            return Optional.empty();
        }

        List<WalletTransaccion> pendientes = txRepo.findSinLiquidar(empresaId, TIPOS, hasta);
        Set<Long> pedidoIds = new HashSet<>();
        for (WalletTransaccion t : pendientes) {
            if (WalletTransaccion.CREDITO_VENTA.equals(t.getTipo()) && t.getReferenciaId() != null) pedidoIds.add(t.getReferenciaId());
        }
        Set<Long> cod = pedidoIds.isEmpty() ? Set.of() : new HashSet<>(txRepo.findPedidosContraEntrega(pedidoIds));

        List<WalletTransaccion> cubiertos = new ArrayList<>();
        long neto = 0;
        for (WalletTransaccion t : pendientes) {
            boolean esVenta = WalletTransaccion.CREDITO_VENTA.equals(t.getTipo());
            if (esVenta) {
                boolean esCod = t.getReferenciaId() != null && cod.contains(t.getReferenciaId());
                if (esCod != contraEntrega) continue;
            } else if (t.getMonto() > 0) {
                // ajustes positivos van con la liquidación periódica
                if (contraEntrega) continue;
            }
            // negativos (devoluciones, ajustes, saldos adeudados) se descuentan en la primera liquidación que llegue
            neto += t.getMonto();
            cubiertos.add(t);
        }
        long disponible = walletRepo.findSaldoDisponible(empresaId).orElse(0L);
        long monto = Math.min(neto, disponible);
        if (monto <= 0) {
            log.info("[liquidacion] empresa={} {} neto=₡{} disponible=₡{}: nada que liquidar",
                empresaId, tipoLiquidacion, neto, disponible);
            return Optional.empty();
        }
        PayoutRequest pr = payoutService.retenerYCrear(empresaId, monto, tipoLiquidacion, cuenta.get(),
            cubiertos.size() + " movimientos hasta " + hasta.toLocalDate());
        for (WalletTransaccion t : cubiertos) t.setPayoutLiquidacionId(pr.getId());
        txRepo.saveAll(cubiertos);
        return Optional.of(pr);
    }

    public List<Long> empresasConVentasSinLiquidar(LocalDateTime hasta) {
        return txRepo.findEmpresasConCreditosSinLiquidar(hasta);
    }
}
