package com.hotclick.service.suscripcion;

import com.hotclick.service.onvo.OnvoBillingClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;

/**
 * Precio esperado de un plan en el billing ONVO: moneda y monto salen de la configuración
 * ({@code hotclick.planes.moneda} y {@code hotclick.planes.*.precio-mensual-usd}) y se confirman por GET del price
 * en ONVO (moneda y unitAmount). Si config y ONVO no coinciden, no hay precio y el pago no se activa (fail-closed).
 * Un GET que falla lanza: el llamador lo trata como transitorio (reintento), nunca como precio válido.
 */
@Component
public class PrecioPlanOnvo {

    private static final Logger log = LoggerFactory.getLogger(PrecioPlanOnvo.class);

    /** ONVO expresa los montos en la unidad menor de la moneda (centavos): conversión de unidad, no un precio. */
    static final int DECIMALES_UNIDAD_MENOR = 2;

    private final PreciosPlanesConfig config;
    private final OnvoBillingClient onvo;

    public PrecioPlanOnvo(PreciosPlanesConfig config, OnvoBillingClient onvo) {
        this.config = config;
        this.onvo = onvo;
    }

    /**
     * Plan de un price de ONVO. Un price que no es de ningún plan es un rechazo permanente (null), salvo que falte
     * configurar los price ids (ONVO_PRICE_ID_*): entonces es un problema de configuración y se lanza
     * {@link ConfigBillingFaltanteException} (transitorio).
     */
    public String planParaPriceId(String priceId) {
        String plan = onvo.planParaPriceId(priceId);
        if (plan == null && onvo.faltanPriceIds()) {
            throw faltante("ONVO_PRICE_ID_*");
        }
        return plan;
    }

    /**
     * @return moneda y monto esperados, o null si el price de ONVO no coincide con la configuración (permanente).
     * @throws ConfigBillingFaltanteException si falta o es inválida la configuración (moneda o precio del plan):
     *         transitorio, se corrige por configuración y el evento se reintenta.
     */
    public OnvoBillingVerificador.PrecioEsperado esperado(String planNombre, String priceId) {
        Optional<BigDecimal> precioCfg = config.precioUsd(planNombre).filter(v -> v.signum() > 0);
        Optional<String> monedaCfg = config.moneda();
        if (monedaCfg.isEmpty()) throw faltante("PLANES_MONEDA");
        Long configurado = precioCfg.map(PrecioPlanOnvo::enUnidadMenor).orElse(null);
        if (configurado == null) throw faltante(String.valueOf(planNombre).toUpperCase(java.util.Locale.ROOT) + "_PRECIO_MENSUAL_USD");
        if (priceId == null) {
            return sinPrecio(planNombre, "plan sin price");
        }
        Map<?, ?> price = onvo.obtenerPrecio(priceId);
        boolean coincide = priceId.equals(OnvoBillingVerificador.texto(price, "id"))
            && OnvoBillingVerificador.modoCoincide(price, onvo.modoEsperado())
            && !"false".equalsIgnoreCase(OnvoBillingVerificador.texto(price, "isActive"))
            && monedaCfg.get().equalsIgnoreCase(OnvoBillingVerificador.texto(price, "currency"))
            && configurado.equals(unitAmount(price));
        return coincide ? new OnvoBillingVerificador.PrecioEsperado(monedaCfg.get(), configurado)
            : sinPrecio(planNombre, "el price de ONVO no coincide con la moneda y el precio configurados");
    }

    /** Alerta sin datos personales: solo el nombre de la propiedad que falta, nunca valores. */
    private static ConfigBillingFaltanteException faltante(String propiedad) {
        log.error("[ALERTA-PAGO] Billing ONVO sin configuración, el evento se reintenta: falta {}", propiedad);
        return new ConfigBillingFaltanteException(propiedad);
    }

    private static OnvoBillingVerificador.PrecioEsperado sinPrecio(String plan, String motivo) {
        log.error("[ALERTA-PAGO] Billing ONVO sin precio verificable plan={} motivo={}", plan, motivo);
        return null;
    }

    private static Long enUnidadMenor(BigDecimal precio) {
        try {
            return precio.movePointRight(DECIMALES_UNIDAD_MENOR).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
        } catch (ArithmeticException e) {
            return null; // fracción de centavo: configuración inválida
        }
    }

    private static Long unitAmount(Map<?, ?> price) {
        String v = OnvoBillingVerificador.texto(price, "unitAmount");
        if (v == null) return null;
        try {
            return new BigDecimal(v).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
        } catch (ArithmeticException | NumberFormatException e) {
            return null;
        }
    }
}
