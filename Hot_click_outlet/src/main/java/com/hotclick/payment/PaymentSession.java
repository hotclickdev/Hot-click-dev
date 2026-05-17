package com.hotclick.payment;

/**
 * Resultado de iniciar una sesión de pago con un proveedor externo.
 *
 * @param externalId  ID de la sesión en el proveedor (merchantToken en PayXpert, orderId en PayPal).
 * @param redirectUrl URL a la que redirigir al usuario para completar el pago.
 */
public record PaymentSession(String externalId, String redirectUrl) {}
