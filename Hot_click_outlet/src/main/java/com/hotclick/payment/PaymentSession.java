package com.hotclick.payment;

/**
 * Resultado de iniciar una sesión de pago con un proveedor externo.
 *
 * @param externalId   ID de la sesión / orderNumber en el proveedor.
 * @param redirectUrl  URL de retorno (propia si modoEmbebido; externa si hosted).
 * @param sdkToken     Token del SDK (Tilopay); null en pasarelas hosted.
 * @param modoEmbebido true si el pago se completa en nuestra página (SDK).
 */
public record PaymentSession(
    String externalId,
    String redirectUrl,
    String sdkToken,
    boolean modoEmbebido
) {
    /** Compatibilidad con Stripe/ONVO/SINPE (sin SDK). */
    public PaymentSession(String externalId, String redirectUrl) {
        this(externalId, redirectUrl, null, false);
    }
}
