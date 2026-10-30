package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentExpirationCleanupService {

    private static final Logger log = LoggerFactory.getLogger(PaymentExpirationCleanupService.class);

    @Autowired private EmpresaRepository          empresaRepository;
    @Autowired private PagoRepository             pagoRepository;
    @Autowired private TilopayConfirmacionService tilopayConfirmacionService;
    @Autowired private OnvoPaymentProvider        onvoPaymentProvider;
    @Autowired private PagoExpiradoCancelador     pagoExpiradoCancelador;
    @Autowired private ReservaAntiBotService      reservaAntiBot;
    @Autowired private ReservaSospechosaLiberador reservaSospechosaLiberador;

    /** Minutos sin pagar tras los que un pago pendiente se reconsulta y, si corresponde, se cancela. */
    @Value("${hotclick.pagos.onvo.vencimiento-minutos:30}")
    private long vencimientoMinutos = 30;

    @Scheduled(fixedRateString = "${hotclick.pagos.onvo.cleanup-intervalo-ms:300000}")
    @SchedulerLock(name = "payment_expiration_cleanup", lockAtMostFor = "PT3M", lockAtLeastFor = "PT30S")
    // Sin @Transactional (QA5 ALTO): ver PagoExpiradoCancelador.
    public void cancelarExpirados() {
        ejecutar();
    }

    /** Cuerpo del scheduler, sin ShedLock (lo usan los tests con reloj controlado). */
    public void ejecutar() {
        LocalDateTime ahora = reservaAntiBot.ahora();
        LocalDateTime corte = ahora.minusMinutes(Math.max(1, vencimientoMinutos));
        for (Empresa empresa : empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")) {
            try {
                cancelarExpiradosDeEmpresa(empresa.getId(), corte);
                // Regla anti-bot (QA-CONC-4): reservas marcadas cuya liberación ya venció.
                reservaSospechosaLiberador.liberarVencidas(empresa.getId(), ahora);
            } catch (Exception e) {
                log.error("[payment-cleanup] Error empresa={}: {}", empresa.getId(), e.getClass().getSimpleName());
            }
        }
    }

    private void cancelarExpiradosDeEmpresa(Long empresaId, LocalDateTime corte) {
        List<Pago> expirados = pagoRepository.findExpiradosPendientesByEmpresa(corte, empresaId);
        int cancelados = 0;

        for (Pago pago : expirados) {
            // Las reconsultas a Tilopay/ONVO corren SIN transacción abierta acá: si confirman, su
            // captura toma los locks de producto en su propia transacción y no espera a nadie nuestro.
            if (Constants.PROVEEDOR_TILOPAY.equalsIgnoreCase(pago.getProveedor())) {
                try {
                    if (tilopayConfirmacionService.intentarConfirmarSiAprobado(pago)) {
                        log.info("[payment-cleanup] Tilopay ya aprobado — confirmado: {}",
                            pago.getMerchantToken());
                        continue;
                    }
                } catch (Exception e) {
                    log.warn("[payment-cleanup] Reconsulta Tilopay falló token={}: {}",
                        pago.getMerchantToken(), e.getClass().getSimpleName());
                }
            }

            if (Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor()) && !onvoPermiteCancelar(pago)) {
                continue;
            }

            try {
                // QA5 ALTO: cada pago en su transacción; al volver, sus locks ya se soltaron.
                if (pagoExpiradoCancelador.cancelar(pago.getId())) cancelados++;
            } catch (Exception e) {
                log.error("[payment-cleanup] No se pudo cancelar pago id={}: {}", pago.getId(),
                    e.getClass().getSimpleName());
            }
        }

        if (cancelados > 0) {
            log.info("Cleanup TTL empresa={}: {} pagos expirados cancelados", empresaId, cancelados);
        }
    }

    /**
     * Antes de cancelar un pago ONVO vencido se le pregunta a ONVO: si cobró (webhook atrasado o perdido)
     * se confirma; si el cobro sigue en proceso, no se pudo consultar o el monto no coincide, queda
     * pendiente para la próxima vuelta. Solo se cancela si ONVO no tiene la sesión o la deja expirada
     * y sin cobro, así ya no se puede pagar un pedido cancelado.
     */
    private boolean onvoPermiteCancelar(Pago pago) {
        try {
            OnvoPaymentProvider.Verificacion v = onvoPaymentProvider.procesarPagoVerificado(
                pago.getMerchantToken(), "cleanup");
            switch (v) {
                case OK, DUPLICADO, COBRADO_SOBRE_CANCELADO, COBRADO_SOBREVENTA -> {
                    log.info("[payment-cleanup] ONVO ya cobrado — confirmado: {}", pago.getMerchantToken());
                    return false;
                }
                case NO_ENCONTRADO -> {
                    return true;
                }
                case NO_PAGADO -> {
                    return onvoPaymentProvider.expirarSesionSinCobro(pago.getMerchantToken());
                }
                default -> {
                    return false;
                }
            }
        } catch (Exception e) {
            log.warn("[payment-cleanup] Reconsulta ONVO falló token={}: {}", pago.getMerchantToken(), e.getClass().getSimpleName());
            return false;
        }
    }
}
