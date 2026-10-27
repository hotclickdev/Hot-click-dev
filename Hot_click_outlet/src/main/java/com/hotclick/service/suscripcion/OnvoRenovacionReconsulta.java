package com.hotclick.service.suscripcion;

import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;

/**
 * A5-01: antes de pasar a PAST_DUE o a VENCIDO una suscripción ONVO, se le pregunta a ONVO (GET, nunca el webhook).
 * Si ONVO confirma que está active y con la factura más reciente pagada y completa, se reactiva con el mismo camino
 * verificado del webhook ({@code procesarPagoOnvoVerificado}). Si el GET falla o ONVO no se puede verificar,
 * el resultado es INCIERTA y quien llama NO da de baja (fail-closed hacia el cliente que pudo haber pagado).
 */
@Service
public class OnvoRenovacionReconsulta {

    private static final Logger log = LoggerFactory.getLogger(OnvoRenovacionReconsulta.class);

    /** PAGADA: ya se reactivó. NO_PAGADA: ONVO confirma que no hay pago vigente (sigue el flujo normal). INCIERTA: no tocar. */
    public enum Estado { PAGADA, NO_PAGADA, INCIERTA }

    private static final java.util.regex.Pattern ID = java.util.regex.Pattern.compile("^[A-Za-z0-9_-]{1,64}$");

    private final OnvoBillingClient onvo;
    private final PlanRepository planRepo;
    private final SuscripcionOnvoChangeService cambio;

    public OnvoRenovacionReconsulta(OnvoBillingClient onvo, PlanRepository planRepo, SuscripcionOnvoChangeService cambio) {
        this.onvo = onvo;
        this.planRepo = planRepo;
        this.cambio = cambio;
    }

    /** Solo para suscripciones con onvoSubscriptionId; el id sale de nuestra base, no del cuerpo de un webhook. */
    public Estado reconsultar(Suscripcion local, LocalDate hoy) {
        String subId = local.getOnvoSubscriptionId();
        try {
            Estado previo = prechequeo(subId);
            if (previo != null) return previo;
            Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
            String modo = onvo.modoEsperado();
            if (!OnvoBillingVerificador.modoCoincide(sub, modo)
                    || !subId.equals(OnvoBillingVerificador.texto(sub, "id"))
                    || !customerCompatible(local, sub)) {
                return incierta(subId, "datos de ONVO no verificables");
            }
            if (!"active".equalsIgnoreCase(OnvoBillingVerificador.texto(sub, "status"))) {
                return Estado.NO_PAGADA;
            }
            return evaluarFactura(local, sub, subId, modo, hoy);
        } catch (RuntimeException e) {
            return incierta(subId, "GET a ONVO falló: " + e.getClass().getSimpleName());
        }
    }

    private Estado prechequeo(String subId) {
        if (!idValido(subId)) return incierta(subId, "id inválido");
        if (onvo.sinLlave() || onvo.isMockMode() || onvo.isBillingDeshabilitado()) {
            return incierta(subId, "ONVO sin llave real o deshabilitado");
        }
        return null;
    }

    private Estado evaluarFactura(Suscripcion local, Map<?, ?> sub, String subId, String modo, LocalDate hoy) {
        String facturaId = OnvoBillingVerificador.texto(sub, "latestInvoiceId");
        if (facturaId == null || !idValido(facturaId)) return incierta(subId, "sin factura");
        Map<?, ?> factura = onvo.obtenerRenovacion(facturaId);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.renovacion(
            factura, sub, facturaId, subId, modo, onvo::planParaPriceId, this::precioPlan);
        if (!r.aceptado()) {
            // Solo una factura sin pagar confirma que no hay pago. Cualquier otra discrepancia (monto distinto al
            // plan, moneda, price, ids) no autoriza a dar de baja a quien puede haber pagado: queda para revisión.
            return "no_pagado".equals(r.motivo()) ? Estado.NO_PAGADA
                : incierta(subId, "factura no verificable: " + r.motivo());
        }
        // Factura pagada de un período que ya terminó = ONVO todavía no renovó: sigue el flujo normal de gracia.
        if (!r.fechaFin().isAfter(hoy)) return Estado.NO_PAGADA;
        if (planRepo.findByNombre(r.planNombre()).isEmpty()) return incierta(subId, "plan no configurado");
        cambio.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin());
        log.info("[billing-onvo] Reconsulta reactivó empresa={} hasta={} (ONVO active y factura pagada)",
            local.getEmpresa() == null ? null : local.getEmpresa().getId(), r.fechaFin());
        return Estado.PAGADA;
    }

    /** Si la fila local ya tiene customer, tiene que ser el mismo que ONVO confirma. */
    private static boolean customerCompatible(Suscripcion local, Map<?, ?> sub) {
        String propio = local.getOnvoCustomerId();
        if (propio == null || propio.isBlank()) return true;
        return propio.equals(OnvoBillingVerificador.texto(sub, "customerId"));
    }

    private Integer precioPlan(String nombre) {
        return planRepo.findByNombre(nombre).map(Plan::getPrecioMensual).orElse(null);
    }

    private static boolean idValido(String id) {
        return id != null && ID.matcher(id).matches();
    }

    private static Estado incierta(String subId, String motivo) {
        log.warn("[ALERTA-PAGO] Reconsulta ONVO incierta, no se da de baja sub={} motivo={}", subId, motivo);
        return Estado.INCIERTA;
    }
}
