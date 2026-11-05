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
 *   <li>Sin confirmación, o si ONVO falla: no cambia nada.</li>
 *   <li>Ignora filas sin plan pendiente, sin id ONVO o con {@code onvo_sub_por_cancelar} (reemplazo en revisión).
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

    /** Al volver de «Completar pago» (endpoint del propietario). */
    public Resultado reconciliarEmpresa(Long empresaId) {
        return suscripcionRepo.findActivaByEmpresaId(empresaId).map(this::reconciliar).orElse(Resultado.IGNORADA);
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
        String subId = local == null ? null : local.getOnvoSubscriptionId();
        if (subId == null || !OnvoBillingClient.idValido(subId) || local.getPlanPendiente() == null
                || local.getOnvoSubPorCancelar() != null) {
            return Resultado.IGNORADA;
        }
        String ref = SuscripcionOnvoChangeService.enmascarar(subId);
        try {
            String modo = onvo.modoEsperado();
            Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
            if (!OnvoBillingVerificador.modoCoincide(sub, modo) || !subId.equals(OnvoBillingVerificador.texto(sub, "id"))
                    || !customerCompatible(local, sub)) {
                log.warn("[billing-onvo] reconciliación: datos de ONVO no verificables sub={}", ref);
                return Resultado.SIN_CONFIRMAR;
            }
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
            cambio.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin(), facturaId);
            return Resultado.ACTIVADA;
        } catch (RuntimeException e) {
            log.warn("[ALERTA-PAGO] reconciliación ONVO falló, sin cambios sub={} causa={}", ref,
                e.getClass().getSimpleName());
            return Resultado.ONVO_NO_DISPONIBLE;
        }
    }

    private static boolean customerCompatible(Suscripcion local, Map<?, ?> sub) {
        String propio = local.getOnvoCustomerId();
        if (propio == null || propio.isBlank()) return false; // fail-closed: sin customer local no se activa por acá
        return propio.equals(OnvoBillingVerificador.texto(sub, "customerId"));
    }
}
