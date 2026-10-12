package com.hotclick.service.wallet;

import com.hotclick.model.MetodoCobro;
import com.hotclick.service.consola.QuincenaCalculo;
import com.hotclick.utils.Constants;
import java.time.LocalDate;
import java.util.Optional;
import com.hotclick.model.PayoutRequest;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.MetodoCobroRepository;
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
    private final MetodoCobroRepository metodoRepo;

    public WalletPayoutRequestService(WalletRepository walletRepo,
                                      WalletTransaccionRepository txRepo,
                                      PayoutRequestRepository payoutRepo,
                                      ModeracionAdminAvisoService moderacionAdminAvisoService,
                                      MetodoCobroRepository metodoRepo) {
        this.metodoRepo = metodoRepo;
        this.walletRepo = walletRepo;
        this.txRepo     = txRepo;
        this.payoutRepo = payoutRepo;
        this.moderacionAdminAvisoService = moderacionAdminAvisoService;
    }

    /**
     * Retiro manual pedido por el negocio. Desde V169 el destino es SIEMPRE la cuenta verificada
     * del negocio (los destinos enviados por el cliente se ignoran). Solo bloquea otro retiro MANUAL
     * abierto: las liquidaciones automáticas (TARJETA / CONTRA_ENTREGA) son independientes.
     */
    @Transactional
    public PayoutRequest solicitarPayout(Long empresaId, long monto, String metodo,
                                         String destinoSinpe, String destinoIban,
                                         String nombreTitular, String bancoDestino,
                                         String notas) {
        if (monto <= 0) throw new IllegalArgumentException("El monto del payout debe ser mayor a 0");
        MetodoCobro cuenta = cuentaVerificada(empresaId);
        return retenerYCrear(empresaId, monto, PayoutRequest.LIQ_MANUAL, cuenta, notas);
    }

    public MetodoCobro cuentaVerificada(Long empresaId) {
        return buscarCuentaVerificada(empresaId).orElseThrow(() -> new IllegalStateException(
            "Registra tu cuenta SINPE Móvil o IBAN y espera su verificación para recibir pagos."));
    }

    /**
     * Cuenta de cobro apta para recibir dinero: activa, SINPE o IBAN, sin cambio en revisión y
     * registrada antes de la quincena en curso (misma regla que la aprobación de payouts).
     */
    public Optional<MetodoCobro> buscarCuentaVerificada(Long empresaId) {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        return metodoRepo.findActivosByEmpresaId(empresaId).stream()
            .filter(m -> !m.isEnRevision())
            .filter(m -> MetodoCobro.TIPO_SINPE.equals(m.getTipo()) || MetodoCobro.TIPO_IBAN.equals(m.getTipo()))
            .filter(m -> !QuincenaCalculo.registradaEnQuincena(m.getFechaCreacion(), hoy))
            .findFirst();
    }

    /** Retiene saldo y crea el payout hacia la cuenta verificada. Usado por retiros manuales y liquidaciones. */
    @Transactional
    public PayoutRequest retenerYCrear(Long empresaId, long monto, String tipoLiquidacion,
                                       MetodoCobro cuenta, String notas) {
        if (payoutRepo.existsByEmpresaIdAndTipoLiquidacionAndEstadoIn(empresaId, tipoLiquidacion,
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
        txRetencion.setDescripcion(switch (tipoLiquidacion) {
            case PayoutRequest.LIQ_CONTRA_ENTREGA -> "Liquidación contra entrega (día siguiente)";
            case PayoutRequest.LIQ_TARJETA -> "Liquidación periódica de pagos con tarjeta";
            default -> "Retiro solicitado — en revisión";
        });
        txRetencion = txRepo.save(txRetencion);

        PayoutRequest pr = new PayoutRequest();
        pr.setEmpresaId(empresaId);
        pr.setMonto(monto);
        pr.setTipoLiquidacion(tipoLiquidacion);
        pr.setMetodoCobroId(cuenta.getId());
        if (MetodoCobro.TIPO_SINPE.equals(cuenta.getTipo())) {
            pr.setMetodo(PayoutRequest.METODO_SINPE);
            pr.setDestinoSinpe(cuenta.getDestino());
        } else {
            pr.setMetodo(PayoutRequest.METODO_TRANSFERENCIA);
            pr.setDestinoIban(cuenta.getDestino());
        }
        pr.setNotasSolicitante(notas);
        pr.setWalletTxRetencionId(txRetencion.getId());
        pr = payoutRepo.save(pr);

        txRetencion.setReferenciaId(pr.getId());
        txRetencion.setPayoutLiquidacionId(pr.getId());
        txRepo.save(txRetencion);

        log.info("[wallet] Payout #{} {} empresa={} monto=₡{} metodo={}",
            pr.getId(), tipoLiquidacion, empresaId, monto, pr.getMetodo());
        moderacionAdminAvisoService.avisarPayout(pr.getId(), empresaId, monto);
        return pr;
    }
}
