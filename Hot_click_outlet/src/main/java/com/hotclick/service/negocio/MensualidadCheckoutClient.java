package com.hotclick.service.negocio;

/**
 * S4-24: Checkout de ONVO para pagar la mensualidad. La implementación real necesita las llaves sandbox
 * (S2-01); hasta entonces el bean es {@link MensualidadCheckoutNoConfigurado} y falla cerrado (PAG-6).
 */
public interface MensualidadCheckoutClient {

    boolean configurado();

    /** URL https del Checkout de ONVO por {@code montoCrc} (el precio del plan, nunca otro). */
    String crearCheckout(Long empresaId, String planNombre, int montoCrc);

    class NoConfiguradoException extends RuntimeException {
        public NoConfiguradoException() {
            super("El pago de la mensualidad con ONVO todavía no está disponible. Intentá más tarde.");
        }
    }
}
