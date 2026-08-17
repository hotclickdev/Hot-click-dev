package com.hotclick.service.wallet;

import com.hotclick.model.PayoutRequest;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class WalletPayoutAdminService {

    private static final Logger log = LoggerFactory.getLogger(WalletPayoutAdminService.class);

    private final WalletRepository walletRepo;
    private final WalletTransaccionRepository txRepo;
    private final PayoutRequestRepository payoutRepo;

    public WalletPayoutAdminService(WalletRepository walletRepo,
                                    WalletTransaccionRepository txRepo,
                                    PayoutRequestRepository payoutRepo) {
        this.walletRepo = walletRepo;
        this.txRepo     = txRepo;
        this.payoutRepo = payoutRepo;
    }

    @Transactional
    public PayoutRequest aprobarPayout(Long payoutId, String notasAdmin) {
        PayoutRequest pr = payoutRepo.findByIdForUpdate(payoutId)
            .orElseThrow(() -> new IllegalArgumentException("Payout no encontrado: " + payoutId));

        if (!PayoutRequest.PENDIENTE.equals(pr.getEstado()) &&
            !PayoutRequest.EN_PROCESO.equals(pr.getEstado())) {
            throw new IllegalStateException("El payout ya fue " + pr.getEstado());
        }

        int filas = walletRepo.confirmarPayout(pr.getEmpresaId(), pr.getMonto());
        if (filas == 0) {
            throw new IllegalStateException(
                "Saldo retenido insuficiente para empresa=" + pr.getEmpresaId() +
                " — posible inconsistencia de datos. Revisar manualmente.");
        }

        long saldoActual = walletRepo.findSaldoDisponible(pr.getEmpresaId()).orElse(0L);
        WalletTransaccion txPago = new WalletTransaccion();
        txPago.setEmpresaId(pr.getEmpresaId());
        txPago.setTipo(WalletTransaccion.DEBITO_PAYOUT);
        txPago.setMonto(-pr.getMonto());
        txPago.setSaldoTrasMovimiento(saldoActual);
        txPago.setReferenciaTipo(WalletTransaccion.REF_PAYOUT);
        txPago.setReferenciaId(pr.getId());
        txPago.setDescripcion("Retiro pagado — payout #" + pr.getId());
        txPago = txRepo.save(txPago);

        pr.setEstado(PayoutRequest.PAGADO);
        pr.setFechaPago(LocalDateTime.now(Constants.ZONA_CR));
        pr.setNotasAdmin(notasAdmin);
        pr.setWalletTxPagoId(txPago.getId());
        pr = payoutRepo.save(pr);

        log.info("[wallet] Payout #{} APROBADO empresa={} monto=₡{}",
            payoutId, pr.getEmpresaId(), pr.getMonto());
        return pr;
    }

    @Transactional
    public PayoutRequest rechazarPayout(Long payoutId, String notasAdmin) {
        PayoutRequest pr = payoutRepo.findByIdForUpdate(payoutId)
            .orElseThrow(() -> new IllegalArgumentException("Payout no encontrado: " + payoutId));

        if (!PayoutRequest.PENDIENTE.equals(pr.getEstado()) &&
            !PayoutRequest.EN_PROCESO.equals(pr.getEstado())) {
            throw new IllegalStateException("El payout ya fue " + pr.getEstado());
        }

        walletRepo.liberarRetencion(pr.getEmpresaId(), pr.getMonto());

        long saldoActual = walletRepo.findSaldoDisponible(pr.getEmpresaId()).orElse(0L);
        WalletTransaccion txLib = new WalletTransaccion();
        txLib.setEmpresaId(pr.getEmpresaId());
        txLib.setTipo(WalletTransaccion.LIBERACION_PAYOUT);
        txLib.setMonto(pr.getMonto());
        txLib.setSaldoTrasMovimiento(saldoActual);
        txLib.setReferenciaTipo(WalletTransaccion.REF_PAYOUT);
        txLib.setReferenciaId(pr.getId());
        txLib.setDescripcion("Retiro rechazado — fondos liberados — payout #" + pr.getId());
        txRepo.save(txLib);

        pr.setEstado(PayoutRequest.RECHAZADO);
        pr.setNotasAdmin(notasAdmin);
        pr = payoutRepo.save(pr);

        log.info("[wallet] Payout #{} RECHAZADO empresa={} — fondos liberados", payoutId, pr.getEmpresaId());
        return pr;
    }
}
