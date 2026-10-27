package com.hotclick.service.suscripcion;

import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A5-01: antes de pasar a PAST_DUE o a VENCIDO una suscripción ONVO, se le pregunta a ONVO (GET, nunca el webhook).
 * Si ONVO confirma que está active y con la factura más reciente pagada y completa, se reactiva con el mismo camino
 * verificado del webhook ({@code procesarPagoOnvoVerificado}). Si el GET falla o ONVO no se puede verificar,
 * el resultado es INCIERTA y quien llama NO da de baja (fail-closed hacia el cliente que pudo haber pagado).
 * <p>La incertidumbre tiene tope (propiedad {@code hotclick.billing.dias-max-incierta}, contada desde fecha_fin más
 * la gracia): un error permanente de ONVO no puede dejar la suscripción gratis para siempre. Pasado el plazo se
 * devuelve NO_PAGADA con alerta y sigue el flujo normal hacia PAST_DUE y VENCIDO.
 * <p>La reactivación corre en su propia transacción (REQUIRES_NEW): si una fila falla, solo se revierte esa fila y
 * no la corrida completa de las 03:00. Esa transacción espera como máximo {@code hotclick.billing.lock-timeout-ms}
 * por el lock de la fila (si vence, la fila queda INCIERTA y se reintenta).
 * <p>B1: tras {@code hotclick.billing.max-inciertas-seguidas} fallos TRANSITORIOS seguidos (GET caído, timeout, llave,
 * lock) en una corrida se dejan de hacer GET por el resto de esa corrida. Los INCIERTA permanentes (404, modo ajeno,
 * sin factura, datos que no cuadran) no cuentan, y una fila que ya pasó el plazo máximo nunca se corta: se consulta
 * igual. Cada job tiene su propio contador ({@link Corrida}) y lo reinicia con {@link #iniciarCorrida(Corrida)}.
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
    private final LockTimeoutPorFila lockTimeout;
    private final PrecioPlanOnvo precioPlan;
    private final int diasGracia;
    private final int diasMaxIncierta;
    private final int maxInciertasSeguidas;
    private final Map<Corrida, AtomicInteger> inciertasSeguidas = new EnumMap<>(Corrida.class);

    /** Job que reconsulta: cada uno lleva su propio conteo de fallos seguidos (no se pisan entre sí). */
    public enum Corrida { GENERAR_RENOVACIONES, EXPIRAR_PAST_DUE }

    /** Resultado de una consulta; {@code transitoria} solo aplica a INCIERTA (un reintento puede arreglarlo). */
    private record Consulta(Estado estado, boolean transitoria) {
        static final Consulta NO_PAGADA = new Consulta(Estado.NO_PAGADA, false);
        static final Consulta PAGADA = new Consulta(Estado.PAGADA, false);
    }

    /** Moneda real configurada de los cobros ONVO (para el ledger); vacía si falta {@code PLANES_MONEDA}. */
    public java.util.Optional<String> monedaConfigurada() {
        return precioPlan.moneda();
    }

    public OnvoRenovacionReconsulta(OnvoBillingClient onvo, PlanRepository planRepo, SuscripcionOnvoChangeService cambio,
                                    PlatformTransactionManager txManager, LockTimeoutPorFila lockTimeout,
                                    OnvoReconsultaConfig config, PrecioPlanOnvo precioPlan) {
        this.onvo = onvo;
        this.planRepo = planRepo;
        this.cambio = cambio;
        this.lockTimeout = lockTimeout;
        this.precioPlan = precioPlan;
        this.txPorFila = new TransactionTemplate(txManager);
        this.txPorFila.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.diasGracia = config.diasGracia();
        this.diasMaxIncierta = config.diasMaxIncierta();
        this.maxInciertasSeguidas = config.maxInciertasSeguidas();
        for (Corrida c : Corrida.values()) inciertasSeguidas.put(c, new AtomicInteger());
    }

    /** B1: cada job nocturno la llama al empezar, para que su conteo de fallos seguidos sea por corrida. */
    public void iniciarCorrida(Corrida corrida) {
        inciertasSeguidas.get(corrida).set(0);
    }

    /** Solo para suscripciones con onvoSubscriptionId; el id sale de nuestra base, no del cuerpo de un webhook. */
    public Estado reconsultar(Suscripcion local, LocalDate hoy, Corrida corrida) {
        AtomicInteger seguidas = inciertasSeguidas.get(corrida);
        boolean plazoAgotado = plazoAgotado(local, hoy);
        // Pasado el plazo máximo no se corta: esa fila se consulta igual (ya no puede quedar INCIERTA sin GET).
        if (!plazoAgotado && circuitoAbierto(seguidas)) {
            incierta(local.getOnvoSubscriptionId(), "corte B1: demasiados fallos transitorios seguidos", true);
            return Estado.INCIERTA;
        }
        Consulta consulta = consultarContando(local, hoy, seguidas);
        if (consulta.estado() == Estado.INCIERTA && plazoAgotado) {
            log.error("[ALERTA-PAGO] Reconsulta ONVO sigue incierta pasado el plazo máximo ({} día(s) tras la gracia): "
                + "sigue el flujo normal de impago empresa={} sub={}", diasMaxIncierta,
                local.getEmpresa() == null ? null : local.getEmpresa().getId(), local.getOnvoSubscriptionId());
            return Estado.NO_PAGADA;
        }
        return consulta.estado();
    }

    private boolean circuitoAbierto(AtomicInteger seguidas) {
        return maxInciertasSeguidas > 0 && seguidas.get() >= maxInciertasSeguidas;
    }

    /** Solo los fallos transitorios cuentan; una respuesta concluyente reinicia el conteo; un INCIERTA permanente lo deja igual. */
    private Consulta consultarContando(Suscripcion local, LocalDate hoy, AtomicInteger seguidas) {
        Consulta consulta = consultar(local, hoy);
        if (consulta.estado() != Estado.INCIERTA) {
            seguidas.set(0);
        } else if (consulta.transitoria() && seguidas.incrementAndGet() == maxInciertasSeguidas) {
            log.error("[ALERTA-PAGO] Reconsulta ONVO: {} fallos transitorios seguidos, se cortan los GET por el resto de "
                + "la corrida (revisar ONVO, la llave y la red)", maxInciertasSeguidas);
        }
        return consulta;
    }

    /** Plazo máximo en INCIERTA: fecha_fin + gracia + días máximos de la configuración. */
    private boolean plazoAgotado(Suscripcion local, LocalDate hoy) {
        return local.getFechaFin() != null
            && hoy.isAfter(local.getFechaFin().plusDays((long) diasGracia + diasMaxIncierta));
    }

    private Consulta consultar(Suscripcion local, LocalDate hoy) {
        String subId = local.getOnvoSubscriptionId();
        try {
            Consulta previo = prechequeo(subId);
            if (previo != null) return previo;
            Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
            String modo = onvo.modoEsperado();
            if (!OnvoBillingVerificador.modoCoincide(sub, modo)
                    || !subId.equals(OnvoBillingVerificador.texto(sub, "id"))
                    || !customerCompatible(local, sub)) {
                return incierta(subId, "datos de ONVO no verificables", false);
            }
            if (!"active".equalsIgnoreCase(OnvoBillingVerificador.texto(sub, "status"))) {
                return Consulta.NO_PAGADA;
            }
            return evaluarFactura(local, sub, subId, modo, hoy);
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone e) {
            // ONVO respondió: el objeto no existe. Reintentar no lo arregla y no es una caída de ONVO.
            return incierta(subId, "ONVO respondió " + e.getStatusCode().value(), false);
        } catch (IllegalArgumentException e) {
            return incierta(subId, "id con formato inválido", false);
        } catch (RuntimeException e) {
            return incierta(subId, "GET a ONVO falló: " + e.getClass().getSimpleName(), true);
        }
    }

    private Consulta prechequeo(String subId) {
        if (!idValido(subId)) return incierta(subId, "id inválido", false);
        if (onvo.sinLlave() || onvo.isMockMode() || onvo.isBillingDeshabilitado()) {
            return incierta(subId, "ONVO sin llave real o deshabilitado", true);
        }
        return null;
    }

    private Consulta evaluarFactura(Suscripcion local, Map<?, ?> sub, String subId, String modo, LocalDate hoy) {
        String facturaId = OnvoBillingVerificador.texto(sub, "latestInvoiceId");
        if (facturaId == null || !idValido(facturaId)) return incierta(subId, "sin factura", false);
        Map<?, ?> factura = onvo.obtenerRenovacion(facturaId);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.renovacion(
            factura, sub, facturaId, subId, modo, precioPlan::planParaPriceId, precioPlan::esperado);
        if (!r.aceptado()) {
            // Solo una factura sin pagar confirma que no hay pago. Cualquier otra discrepancia (monto distinto al
            // plan, moneda, price, ids) no autoriza a dar de baja a quien puede haber pagado: queda para revisión.
            return "no_pagado".equals(r.motivo()) ? Consulta.NO_PAGADA
                : incierta(subId, "factura no verificable: " + r.motivo(),
                    OnvoBillingVerificador.M_CONFIG_FALTANTE.equals(r.motivo())); // config faltante: transitoria
        }
        // Factura pagada de un período que ya terminó = ONVO todavía no renovó: sigue el flujo normal de gracia.
        if (!r.fechaFin().isAfter(hoy)) return Consulta.NO_PAGADA;
        if (planRepo.findByNombre(r.planNombre()).isEmpty()) return incierta(subId, "plan no configurado", false);
        // M2: transacción propia; una falla revierte solo esta fila (la excepción la atrapa consultar → INCIERTA transitoria).
        // B2: la referencia del ledger es el id de la factura (una por mes), no el de la suscripción.
        txPorFila.executeWithoutResult(st -> {
            lockTimeout.aplicar();
            cambio.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin(), facturaId);
        });
        log.info("[billing-onvo] Reconsulta reactivó empresa={} hasta={} (ONVO active y factura pagada)",
            local.getEmpresa() == null ? null : local.getEmpresa().getId(), r.fechaFin());
        return Consulta.PAGADA;
    }

    /** Si la fila local ya tiene customer, tiene que ser el mismo que ONVO confirma. */
    private static boolean customerCompatible(Suscripcion local, Map<?, ?> sub) {
        String propio = local.getOnvoCustomerId();
        if (propio == null || propio.isBlank()) return true;
        return propio.equals(OnvoBillingVerificador.texto(sub, "customerId"));
    }

    private static boolean idValido(String id) {
        return id != null && ID.matcher(id).matches();
    }

    private static Consulta incierta(String subId, String motivo, boolean transitoria) {
        log.warn("[ALERTA-PAGO] Reconsulta ONVO incierta, no se da de baja sub={} motivo={} transitoria={}",
            subId, motivo, transitoria);
        return new Consulta(Estado.INCIERTA, transitoria);
    }
}
