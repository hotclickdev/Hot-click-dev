package com.hotclick.service.wallet;

import com.hotclick.model.PayoutRequest;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.service.ModeracionAdminAvisoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WalletPayoutRequestService {

    private static final Logger log = LoggerFactory.getLogger(WalletPayoutRequestService.class);

    private final WalletRepository walletRepo;
    private final WalletTransaccionRepository txRepo;
    private final PayoutRequestRepository payoutRepo;
    private final ModeracionAdminAvisoService moderacionAdminAvisoService;

    public WalletPayoutRequestService(WalletRepository walletRepo,
                                      WalletTransaccionRepository txRepo,
                                      PayoutRequestRepository payoutRepo,
                                      ModeracionAdminAvisoService moderacionAdminAvisoService) {
        this.walletRepo = walletRepo;
        this.txRepo     = txRepo;
        this.payoutRepo = payoutRepo;
        this.moderacionAdminAvisoService = moderacionAdminAvisoService;
    }

    @Transactional
    public PayoutRequest solicitarPayout(Long empresaId, long monto, String metodo,
                                         String destinoSinpe, String destinoIban,
                                         String nombreTitular, String bancoDestino,
                                         String notas) {
        if (monto <= 0) throw new IllegalArgumentException("El monto del payout debe ser mayor a 0");

        if (payoutRepo.existsByEmpresaIdAndEstadoIn(empresaId,
                List.of(PayoutRequest.PENDIENTE, PayoutRequest.EN_PROCESO))) {
            throw new IllegalStateException("Ya tienes un retiro en proceso. Espera a que sea resuelto antes de solicitar otro.");
        }

        int filasActualizadas = walletRepo.retenerParaPayout(empresaId, monto);
        if (filasActualizadas == 0) {
            throw new IllegalStateException("Saldo insuficiente para procesar el retiro de ₡" +
                String.format("%,d", monto));
        }

        long saldoActual = walletRepo.findSaldoDisponible(empresaId).orElse(0L);
        WalletTransaccion txRetencion = new WalletTransaccion();
        txRetencion.setEmpresaId(empresaId);
        txRetencion.setTipo(WalletTransaccion.RETENCION_PAYOUT);
        txRetencion.setMonto(-monto);
        txRetencion.setSaldoTrasMovimiento(saldoActual);
        txRetencion.setReferenciaTipo(WalletTransaccion.REF_PAYOUT);
        txRetencion.setDescripcion("Retiro solicitado — en revisión");
        txRetencion = txRepo.save(txRetencion);

        PayoutRequest pr = new PayoutRequest();
        pr.setEmpresaId(empresaId);
        pr.setMonto(monto);
        pr.setMetodo(metodo != null ? metodo.toUpperCase() : PayoutRequest.METODO_SINPE);
        pr.setDestinoSinpe(destinoSinpe);
        pr.setDestinoIban(destinoIban);
        pr.setNombreTitular(nombreTitular);
        pr.setBancoDestino(bancoDestino);
        pr.setNotasSolicitante(notas);
        pr.setWalletTxRetencionId(txRetencion.getId());
        pr = payoutRepo.save(pr);

        txRetencion.setReferenciaId(pr.getId());
        txRepo.save(txRetencion);

        log.info("[wallet] Payout #{} solicitado empresa={} monto=₡{} metodo={}",
            pr.getId(), empresaId, monto, pr.getMetodo());
        moderacionAdminAvisoService.avisarPayout(pr.getId(), empresaId, monto);
        return pr;
    }
}
