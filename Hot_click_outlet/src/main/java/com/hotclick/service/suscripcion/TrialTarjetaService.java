package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Captura de la tarjeta durante el trial Emprendedor. ONVO deja la suscripción en {@code trialing} sin tarjeta; la
 * tarjeta se confirma con el SDK web y no cobra hasta que termina el trial. La señal de «tarjeta guardada» es el
 * {@code paymentMethodId} de la suscripción en ONVO (fuente de verdad, sin columna nueva en la base).
 *
 * <p>Todo opera sobre la empresa del JWT ({@code TenantContext}); no recibe ids del cliente. Cualquier estado que no
 * sea «TRIAL Emprendedor vigente» (otro plan, pendiente de cupo o de aprobación, impago, suspendido, trial vencido)
 * responde igual: {@link NoDisponibleException}.
 */
@Service
public class TrialTarjetaService {

    private static final Logger log = LoggerFactory.getLogger(TrialTarjetaService.class);

    /** Estado único e indistinguible para cualquier negocio que no pueda agregar tarjeta ahora. */
    public static class NoDisponibleException extends RuntimeException {
        public static final String CODIGO = "TRIAL_TARJETA_NO_DISPONIBLE";
        public static final String MENSAJE = "Ahora no podés agregar la tarjeta. Si tu prueba está activa, probá de nuevo más tarde.";

        public NoDisponibleException() { super(MENSAJE); }
    }

    /** ONVO no respondió o no está configurado: no se afirma nada sobre la tarjeta (fail-closed). */
    public static class VerificacionNoDisponibleException extends RuntimeException {
        public static final String CODIGO = "TRIAL_TARJETA_VERIFICACION";
        public static final String MENSAJE = "No pudimos verificar tu tarjeta ahora. Probá de nuevo en unos minutos.";

        public VerificacionNoDisponibleException(Throwable causa) { super(MENSAJE, causa); }
    }

    public record Estado(boolean elegible, boolean tarjetaGuardada, long trialDias) {
        static final Estado NO_ELEGIBLE = new Estado(false, false, 0);
    }

    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final OnvoBillingClient onvoBilling;
    private final OnvoService onvoService;
    private final SuscripcionOnvoChangeService changeService;

    public TrialTarjetaService(EmpresaRepository empresaRepo, SuscripcionRepository suscripcionRepo,
                               OnvoBillingClient onvoBilling, OnvoService onvoService,
                               SuscripcionOnvoChangeService changeService) {
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
        this.onvoBilling = onvoBilling;
        this.onvoService = onvoService;
        this.changeService = changeService;
    }

    /** Un TRIAL Emprendedor vigente de un negocio aprobado y al día: el único caso que puede agregar tarjeta. */
    static boolean elegible(Empresa e, LocalDate hoy) {
        if (e == null || !TrialEmprendedorService.tuvoTrial(e)) return false;
        if (!Constants.ESTADO_PLAN_TRIAL.equals(e.getEstadoPlan())) return false;
        if (e.getTrialEmprendedorHasta() == null || e.getTrialEmprendedorHasta().isBefore(hoy)) return false;
        String estadoEmpresa = e.getEstadoEmpresa();
        return !SuspensionImpago.estaSuspendida(estadoEmpresa) && !"PENDIENTE_APROBACION".equals(estadoEmpresa);
    }

    /** Estado para el panel: sin datos de ONVO ni de otros negocios, solo lo que la UI necesita. */
    public Estado estado(Long empresaId) {
        Empresa e = empresaRepo.findById(empresaId).orElse(null);
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        if (!elegible(e, hoy)) return Estado.NO_ELEGIBLE;
        return new Estado(true, tarjetaGuardada(empresaId), TrialEmprendedorService.diasRestantes(e, hoy));
    }

    /**
     * Datos para que el SDK confirme la tarjeta en la suscripción del trial. Si ya hay tarjeta no hay nada que
     * confirmar ({@code tarjeta_guardada}). Nunca activa el plan ni cobra.
     */
    public Map<String, Object> iniciar(Long empresaId) {
        Empresa e = empresaRepo.findById(empresaId).orElse(null);
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        if (!elegible(e, hoy)) throw new NoDisponibleException();
        if (tarjetaGuardada(empresaId)) {
            return Map.of("status", "tarjeta_guardada", "trialDias", (long) TrialEmprendedorService.diasRestantes(e, hoy));
        }
        SuscripcionOnvoChangeService.SuscripcionTrial sub;
        try {
            sub = changeService.asegurarSuscripcionTrial(empresaId);
        } catch (IllegalStateException | IllegalArgumentException | java.util.NoSuchElementException ex) {
            log.warn("[trial-tarjeta] no se pudo preparar la suscripción de empresa={}: {}", empresaId, ex.getMessage());
            throw new NoDisponibleException();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        if (sub.mock()) {
            // Solo dev/test sin llave: no hay SDK real ni tarjeta que guardar.
            out.put("status", "mock");
            out.put("mock", true);
            out.put("trialDias", (long) TrialEmprendedorService.diasRestantes(e, hoy));
            return out;
        }
        out.put("status", "requiere_tarjeta");
        out.put("subscriptionId", sub.subscriptionId());
        out.put("customerId", sub.customerId());
        out.put("publishableKey", onvoService.getPublishableKey());
        out.put("planNombre", "EMPRENDEDOR");
        out.put("trialDias", (long) TrialEmprendedorService.diasRestantes(e, hoy));
        return out;
    }

    /** true si la suscripción ONVO del negocio ya tiene método de pago. Sin suscripción: false. Error de ONVO: excepción. */
    boolean tarjetaGuardada(Long empresaId) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        if (sub == null || sub.getOnvoSubscriptionId() == null || sub.getOnvoSubscriptionId().isBlank()) return false;
        if (onvoBilling.isMockMode()) return false; // dev/test sin llave: no hay ONVO que consultar
        try {
            Map<?, ?> onvo = onvoBilling.obtenerSuscripcion(sub.getOnvoSubscriptionId());
            return tienePaymentMethod(onvo);
        } catch (RuntimeException ex) {
            log.warn("[trial-tarjeta] no se pudo leer la suscripción ONVO de empresa={}: {}", empresaId, ex.getMessage());
            throw new VerificacionNoDisponibleException(ex);
        }
    }

    static boolean tienePaymentMethod(Map<?, ?> onvoSub) {
        if (onvoSub == null) return false;
        Object pm = onvoSub.get("paymentMethodId");
        return pm != null && !String.valueOf(pm).isBlank() && !"null".equals(String.valueOf(pm));
    }
}
