package com.hotclick.service.suscripcion;

import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.Map;

/**
 * A5-01: antes de pasar a PAST_DUE o a VENCIDO una suscripción ONVO, se le pregunta a ONVO (GET, nunca el webhook).
 * Si ONVO confirma que está active y con la factura más reciente pagada y completa, se reactiva con el mismo camino
 * verificado del webhook ({@code procesarPagoOnvoVerificado}). Si el GET falla o ONVO no se puede verificar,
 * el resultado es INCIERTA y quien llama NO da de baja (fail-closed hacia el cliente que pudo haber pagado).
 * <p>La incertidumbre tiene tope (propiedad {@code hotclick.billing.dias-max-incierta}, contada desde fecha_fin más
 * la gracia): un error permanente de ONVO no puede dejar la suscripción gratis para siempre. Pasado el plazo se
 * devuelve NO_PAGADA con alerta y sigue el flujo normal hacia PAST_DUE y VENCIDO.
 * <p>La reactivación corre en su propia transacción (REQUIRES_NEW): si una fila falla, solo se revierte esa fila y
 * no la corrida completa de las 03:00.
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
    private final TransactionTemplate txPorFila;
    private final int diasGracia;
    private final int diasMaxIncierta;

    public OnvoRenovacionReconsulta(OnvoBillingClient onvo, PlanRepository planRepo, SuscripcionOnvoChangeService cambio,
                                    PlatformTransactionManager txManager,
                                    @Value("${hotclick.billing.dias-gracia}") int diasGracia,
                                    @Value("${hotclick.billing.dias-max-incierta}") int diasMaxIncierta) {
        this.onvo = onvo;
        this.planRepo = planRepo;
        this.cambio = cambio;
        this.txPorFila = new TransactionTemplate(txManager);
        this.txPorFila.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.diasGracia = Math.max(0, diasGracia);
        this.diasMaxIncierta = Math.max(0, diasMaxIncierta);
    }

    /** Solo para suscripciones con onvoSubscriptionId; el id sale de nuestra base, no del cuerpo de un webhook. */
    public Estado reconsultar(Suscripcion local, LocalDate hoy) {
        Estado estado = consultar(local, hoy);
        if (estado == Estado.INCIERTA && plazoAgotado(local, hoy)) {
            log.error("[ALERTA-PAGO] Reconsulta ONVO sigue incierta pasado el plazo máximo ({} día(s) tras la gracia): "
                + "sigue el flujo normal de impago empresa={} sub={}", diasMaxIncierta,
                local.getEmpresa() == null ? null : local.getEmpresa().getId(), local.getOnvoSubscriptionId());
            return Estado.NO_PAGADA;
        }
        return estado;
    }

    /** Plazo máximo en INCIERTA: fecha_fin + gracia + días máximos de la configuración. */
    private boolean plazoAgotado(Suscripcion local, LocalDate hoy) {
        return local.getFechaFin() != null
            && hoy.isAfter(local.getFechaFin().plusDays((long) diasGracia + diasMaxIncierta));
    }

    private Estado consultar(Suscripcion local, LocalDate hoy) {
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
        // M2: transacción propia; una falla revierte solo esta fila (la excepción la atrapa reconsultar → INCIERTA).
        txPorFila.executeWithoutResult(st -> cambio.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin()));
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
