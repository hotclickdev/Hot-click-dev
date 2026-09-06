package com.hotclick.scheduler;
import com.hotclick.utils.Constants;

import com.hotclick.model.PayoutRequest;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.service.wallet.WalletPayoutAdminService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Auto-aprueba retiros (payouts) de bajo monto sin pasar por revisión manual
 * de FINANCE/ADMIN — ver {@link Constants#UMBRAL_AUTO_APROBACION_PAYOUT}.
 *
 * Diseño:
 *   - Corre cada 15 minutos con ShedLock (seguro en multi-pod).
 *   - Lee payouts PENDIENTE con monto <= umbral.
 *   - Por cada uno, llama WalletPayoutAdminService.aprobarPayout — que ya
 *     serializa concurrencia vía SELECT FOR UPDATE (findByIdForUpdate).
 *   - Si el saldo retenido es insuficiente (IllegalStateException — posible
 *     inconsistencia de datos), NO se reintenta silenciosamente: se loguea
 *     como ERROR y el payout queda PENDIENTE para revisión manual.
 *   - Un fallo en un payout no frena el resto del lote.
 */
@Component
public class PayoutAutoApprovalScheduler {

    private static final Logger log = LoggerFactory.getLogger(PayoutAutoApprovalScheduler.class);

    private final PayoutRequestRepository   payoutRepo;
    private final WalletPayoutAdminService  walletPayoutAdminService;

    public PayoutAutoApprovalScheduler(PayoutRequestRepository payoutRepo,
                                        WalletPayoutAdminService walletPayoutAdminService) {
        this.payoutRepo = payoutRepo;
        this.walletPayoutAdminService = walletPayoutAdminService;
    }

    @Scheduled(cron = "0 */15 * * * *")
    @SchedulerLock(name = "payout_auto_approval", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void autoAprobarPayoutsPequenos() {
        List<PayoutRequest> pendientes = payoutRepo.findByEstadoOrderByFechaSolicitudAsc(PayoutRequest.PENDIENTE)
            .stream()
            .filter(p -> p.getMonto() != null && p.getMonto() <= Constants.UMBRAL_AUTO_APROBACION_PAYOUT)
            .toList();

        if (pendientes.isEmpty()) return;

        log.info("[payout-auto] {} payout(s) pendientes de auto-aprobación (monto <= ₡{})",
            pendientes.size(), Constants.UMBRAL_AUTO_APROBACION_PAYOUT);

        for (PayoutRequest pr : pendientes) {
            try {
                walletPayoutAdminService.aprobarPayout(pr.getId(),
                    "Auto-aprobado: monto ≤ ₡" + Constants.UMBRAL_AUTO_APROBACION_PAYOUT);
                log.info("[payout-auto] Payout #{} AUTO-APROBADO empresa={} monto=₡{}",
                    pr.getId(), pr.getEmpresaId(), pr.getMonto());
            } catch (IllegalStateException saldoInsuficiente) {
                log.error("[payout-auto] Payout #{} empresa={} monto=₡{} — no se pudo auto-aprobar, " +
                    "requiere revisión manual: {}",
                    pr.getId(), pr.getEmpresaId(), pr.getMonto(), saldoInsuficiente.getMessage());
            } catch (Exception e) {
                log.error("[payout-auto] Payout #{} empresa={} — error inesperado al auto-aprobar: {}",
                    pr.getId(), pr.getEmpresaId(), e.getMessage(), e);
            }
        }
    }
}
