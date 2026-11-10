package com.hotclick.service.suscripcion;

import com.hotclick.model.Suscripcion;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * MEDIO-3: reconciliación fail-closed del alta/cambio ONVO. La activación ya no depende solo del webhook: se le pregunta
 * a ONVO (GET de la suscripción + factura del período actual) al volver de «Completar pago» y en un job acotado.
 * <ul>
 *   <li>Solo activa si ONVO confirma suscripción {@code active} y factura del período {@code paid}, verificadas igual
 *       que en el webhook ({@link OnvoBillingVerificador#renovacion}), y por el MISMO camino idempotente
 *       ({@code procesarPagoOnvoVerificado}, que no hace nada si esa factura ya tiene COBRO_OK).</li>
 *   <li>QA #536: {@code trialing} con método de pago guardado activa el plan hasta el fin del trial
 *       ({@link OnvoBillingVerificador#trialConMetodo}, {@code procesarTrialOnvoVerificado}, una sola vez).</li>
 *   <li>Sin confirmación, o si ONVO falla: no cambia nada. Solo GET a ONVO: no crea cobros ni hace POST.</li>
 *   <li>Con plan pendiente se reconcilia el cambio. Sin plan pendiente también cubre el alta del plan vigente
 *       (suscripción local en trial/incomplete/pending, o {@code estado_plan = REQUIERE_MEMBRESIA}): el cobro
 *       se confirma solo con suscripción {@code active} y factura paid, por el mismo camino del webhook.
 *       El trial con método (#536) sigue exigiendo plan pendiente.</li>
 *   <li>Ignora filas sin id ONVO, con {@code onvo_sub_por_cancelar} o ya activas sin nada pendiente.
 *       El id sale de nuestra base, nunca del cliente.</li>
 * </ul>
 */
@Service
public class OnvoAltaReconciliacion {

    private static final Logger log = LoggerFactory.getLogger(OnvoAltaReconciliacion.class);

    public enum Resultado { ACTIVADA, SIN_CONFIRMAR, ONVO_NO_DISPONIBLE, IGNORADA }

    private final OnvoBillingClient onvo;
    private final SuscripcionRepository suscripcionRepo;
    private final SuscripcionOnvoChangeService cambio;
    private final PrecioPlanOnvo precioPlan;

    @Value("${hotclick.billing.reconciliar.horas:48}")
    int horasRecientes = 48;
    @Value("${hotclick.billing.reconciliar.limite:50}")
    int limite = 50;

    public OnvoAltaReconciliacion(OnvoBillingClient onvo, SuscripcionRepository suscripcionRepo,
                                  SuscripcionOnvoChangeService cambio, PrecioPlanOnvo precioPlan) {
        this.onvo = onvo;
        this.suscripcionRepo = suscripcionRepo;
        this.cambio = cambio;
        this.precioPlan = precioPlan;
    }

    /**
     * Al volver de «Completar pago». Activada solo si esta llamada verifico ONVO (active + factura paid)
     * y paso por {@code procesarPagoOnvoVerificado}. Una fila ya ACTIVA en la base, sin esa verificacion,
     * no se reporta como activada.
     * <p>
     * La empresa entra con JOIN FETCH. El alta en {@code REQUIERE_MEMBRESIA} lee {@code estado_plan} para
     * decidir si consulta ONVO; con {@code open-in-view=false} ese proxy, fuera de la sesión del repositorio,
     * tiraba LazyInitializationException (HTTP 500) y el cobro ya hecho quedaba en «pago en proceso» hasta el
     * job, que sí hace JOIN FETCH. El GET a ONVO no va dentro de esa transacción.
     */
    public Resultado reconciliarEmpresa(Long empresaId) {
        return suscripcionRepo.findActivaConEmpresaByEmpresaId(empresaId).map(this::reconciliar).orElse(Resultado.IGNORADA);
    }

    /** Job: pendientes recientes, con tope por corrida. */
    @Scheduled(fixedDelayString = "${hotclick.billing.reconciliar.cada:PT15M}", initialDelayString = "PT7M")
    @SchedulerLock(name = "reconciliarAltasOnvo", lockAtMostFor = "PT14M", lockAtLeastFor = "PT1M")
    public void reconciliarPendientes() {
        if (onvo.sinLlave() || onvo.isMockMode() || onvo.isBillingDeshabilitado()) return;
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusHours(Math.max(1, horasRecientes));
        List<Suscripcion> filas = suscripcionRepo.findOnvoPendientesRecientes(desde,
            PageRequest.of(0, Math.max(1, Math.min(limite, 200))));
        int activadas = 0;
        for (Suscripcion s : filas) {
            if (reconciliar(s) == Resultado.ACTIVADA) activadas++;
        }
        if (!filas.isEmpty()) {
            log.info("[billing-onvo] reconciliación: {} pendiente(s) revisadas, {} activada(s)", filas.size(), activadas);
        }
    }

    Resultado reconciliar(Suscripcion local) {
        String subId = idAReconciliar(local);
        if (subId == null) return Resultado.IGNORADA;
        String ref = SuscripcionOnvoChangeService.enmascarar(subId);
        try {
            return confirmarConOnvo(local, subId, ref);
        } catch (RuntimeException e) {
            log.warn("[ALERTA-PAGO] reconciliación ONVO falló, sin cambios sub={} causa={}", ref,
                e.getClass().getSimpleName());
            return Resultado.ONVO_NO_DISPONIBLE;
        }
    }

    /**
     * #535: con una subida pendiente se reconcilia la NUEVA. Sin plan pendiente, el alta del plan vigente
     * (fila en trial/incomplete/pending o empresa en REQUIERE_MEMBRESIA). Nunca el id que manda el cliente.
     */
    static String idAReconciliar(Suscripcion local) {
        if (local == null || local.getOnvoSubPorCancelar() != null) return null;
        boolean subida = local.getOnvoSubNuevaPendiente() != null;
        if (subida && local.getPlanPendiente() == null) return null;
        if (local.getPlanPendiente() == null && !altaMismoPlanSinConfirmar(local)) return null;
        String subId = subida ? local.getOnvoSubNuevaPendiente() : local.getOnvoSubscriptionId();
        if (subId == null || !OnvoBillingClient.idValido(subId)) return null;
        return subId;
    }

    /** Alta o repago del plan que ya está en la fila: no hay plan pendiente distinto. */
    static boolean altaMismoPlanSinConfirmar(Suscripcion local) {
        if (local == null || local.getPlanPendiente() != null || local.getOnvoSubNuevaPendiente() != null) return false;
        String estadoEmpresa = local.getEmpresa() == null ? null : local.getEmpresa().getEstadoPlan();
        if (MembresiaPlan.sinConfirmar(estadoEmpresa)) return true;
        return MembresiaPlan.altaIncompleta(local.getEstado());
    }

    private Resultado confirmarConOnvo(Suscripcion local, String subId, String ref) {
        String modo = onvo.modoEsperado();
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        if (!OnvoBillingVerificador.modoCoincide(sub, modo) || !subId.equals(OnvoBillingVerificador.texto(sub, "id"))
                || !customerCompatible(local, sub)) {
            log.warn("[billing-onvo] reconciliación: datos de ONVO no verificables sub={}", ref);
            return Resultado.SIN_CONFIRMAR;
        }
        if ("trialing".equalsIgnoreCase(OnvoBillingVerificador.texto(sub, "status"))) {
            return confirmarTrial(local, sub, subId, modo, ref);
        }
        return confirmarPago(sub, subId, modo, ref);
    }

    /** #536 sigue igual: trial con método solo si hay plan pendiente. El alta del plan vigente espera el cobro. */
    private Resultado confirmarTrial(Suscripcion local, Map<?, ?> sub, String subId, String modo, String ref) {
        if (local.getPlanPendiente() == null) return Resultado.SIN_CONFIRMAR;
        OnvoBillingVerificador.Resultado t = OnvoBillingVerificador.trialConMetodo(
            sub, subId, modo, precioPlan::planParaPriceId, precioPlan::esperado);
        if (!t.aceptado()) {
            log.info("[billing-onvo] reconciliación trial sin confirmar sub={} motivo={}", ref, t.motivo());
            return Resultado.SIN_CONFIRMAR;
        }
        cambio.procesarTrialOnvoVerificado(subId, t.planNombre(), t.fechaFin());
        return Resultado.ACTIVADA;
    }

    private Resultado confirmarPago(Map<?, ?> sub, String subId, String modo, String ref) {
        if (!"active".equalsIgnoreCase(OnvoBillingVerificador.texto(sub, "status"))) return Resultado.SIN_CONFIRMAR;
        Map<?, ?> factura = onvo.obtenerFacturaDelPeriodoActual(sub);
        String facturaId = OnvoBillingVerificador.texto(factura, "id");
        if (facturaId == null || !OnvoBillingClient.idValido(facturaId)) return Resultado.SIN_CONFIRMAR;
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.renovacion(
            factura, sub, facturaId, subId, modo, precioPlan::planParaPriceId, precioPlan::esperado);
        if (!r.aceptado()) {
            log.info("[billing-onvo] reconciliación sin confirmar sub={} motivo={}", ref, r.motivo());
            return Resultado.SIN_CONFIRMAR;
        }
        cambio.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin(), facturaId, r.fechaInicio());
        return Resultado.ACTIVADA;
    }

    private static boolean customerCompatible(Suscripcion local, Map<?, ?> sub) {
        String propio = local.getOnvoCustomerId();
        if (propio == null || propio.isBlank()) return false; // fail-closed: sin customer local no se activa por acá
        return propio.equals(OnvoBillingVerificador.texto(sub, "customerId"));
    }
}
