package com.hotclick.payment;

/**
 * Resultado de iniciar una sesión de pago con un proveedor externo.
 *
 * @param externalId   ID de la sesión / orderNumber en el proveedor.
 * @param redirectUrl  URL de retorno (propia si modoEmbebido; externa si hosted).
 * @param sdkToken     Token de un SDK embebido; null en pasarelas hosted (ONVO).
 * @param modoEmbebido true si el pago se completa en nuestra página (SDK).
 * @param destinoDinero {@code SUBCUENTA} (onBehalfOf) o {@code PLATAFORMA}; null si el proveedor no lo informa (V245).
 * @param destinoCuentaOnvo id de la cuenta conectada usada (solo SUBCUENTA).
 */
public record PaymentSession(
    String externalId,
    String redirectUrl,
    String sdkToken,
    boolean modoEmbebido,
    String destinoDinero,
    String destinoCuentaOnvo
) {
    /** Sin destino registrado (Stripe/SINPE/embebido). */
    public PaymentSession(String externalId, String redirectUrl, String sdkToken, boolean modoEmbebido) {
        this(externalId, redirectUrl, sdkToken, modoEmbebido, null, null);
    }

    /** Compatibilidad con Stripe/ONVO/SINPE (sin SDK). */
    public PaymentSession(String externalId, String redirectUrl) {
        this(externalId, redirectUrl, null, false);
    }
}
