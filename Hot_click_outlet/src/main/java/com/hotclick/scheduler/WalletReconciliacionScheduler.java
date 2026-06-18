package com.hotclick.scheduler;

import com.hotclick.model.WalletAcreditacionFallida;
import com.hotclick.repository.WalletAcreditacionFallidaRepository;
import com.hotclick.service.WalletDlqTxOps;
import com.hotclick.service.WalletService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Reintenta acreditaciones que fallaron en el hilo @Async de AggregatorService.
 *
 * Diseño:
 *   - Corre cada 5 minutos con ShedLock (seguro en multi-pod).
 *   - Lee la DLQ filtrando items con fecha_proximo_intento <= NOW().
 *   - Por cada item, llama WalletService.acreditarVenta — idempotente por diseño.
 *   - Si tiene éxito → marcarProcesado (REQUIRES_NEW).
 *   - Si DataIntegrityViolationException → acreditación ya existía → marcarProcesado.
 *   - Si otro error → marcarFallo con backoff exponencial (2^n minutos, tope 2h).
 *   - Si intentos >= maxIntentos → AGOTADO + log.error CRÍTICO.
 *
 * Un item AGOTADO requiere intervención manual:
 *   1. Verificar si el saldo del emprendedor es correcto.
 *   2. Si no: INSERT manual en wallet_transaccion + UPDATE en wallet_tb.
 *   3. Marcar item como PROCESADO manualmente en la DLQ.
 */
@Component
public class WalletReconciliacionScheduler {

    private static final Logger log = LoggerFactory.getLogger(WalletReconciliacionScheduler.class);

    private final WalletAcreditacionFallidaRepository dlqRepo;
    private final WalletService                       walletService;
    private final WalletDlqTxOps                     dlqTxOps;

    public WalletReconciliacionScheduler(WalletAcreditacionFallidaRepository dlqRepo,
                                          WalletService walletService,
                                          WalletDlqTxOps dlqTxOps) {
        this.dlqRepo       = dlqRepo;
        this.walletService = walletService;
        this.dlqTxOps      = dlqTxOps;
    }

    @Scheduled(fixedRate = 5 * 60 * 1000) // cada 5 minutos
    @SchedulerLock(name = "wallet_reconciliacion_dlq",
                   lockAtMostFor = "PT4M",
                   lockAtLeastFor = "PT30S")
    public void reintentarAcreditacionesFallidas() {
        List<WalletAcreditacionFallida> pendientes =
            dlqRepo.findPendientesParaReintento(LocalDateTime.now());

        if (pendientes.isEmpty()) return;

        log.info("[wallet-dlq] Reconciliación: {} acreditaciones pendientes de reintento", pendientes.size());

        for (WalletAcreditacionFallida item : pendientes) {
            try {
                walletService.acreditarVenta(
                    item.getEmpresaId(),
                    item.getMontoNeto(),
                    item.getTotalBruto(),
                    item.getComSaas(),
                    item.getComGw(),
                    item.getPedidoId()
                );
                dlqTxOps.marcarProcesado(item.getId());
                log.info("[wallet-dlq] Acreditación recuperada: pedido={} empresa={} neto=₡{}",
                    item.getPedidoId(), item.getEmpresaId(), item.getMontoNeto());

            } catch (DataIntegrityViolationException dup) {
                // El unique constraint detectó que la acreditación ya existía —
                // un reintento anterior tuvo éxito pero no pudo marcar el item.
                dlqTxOps.marcarProcesado(item.getId());
                log.info("[wallet-dlq] Item DLQ #{} resuelto por constraint (ya acreditado) — pedido={}",
                    item.getId(), item.getPedidoId());

            } catch (Exception e) {
                dlqTxOps.marcarFallo(item.getId(), e.getMessage());
            }
        }
    }
}
