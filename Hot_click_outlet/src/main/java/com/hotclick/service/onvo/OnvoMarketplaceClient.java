package com.hotclick.service.onvo;

/**
 * S2-13 (interfaz): cuentas de ONVO para los negocios (marketplace). La implementación real necesita las
 * llaves sandbox de ONVO (S2-01); mientras no exista, el bean es {@link OnvoMarketplaceNoConfigurado}
 * y todo falla cerrado (PAG-6): nunca se simula una cuenta ni un enlace.
 */
public interface OnvoMarketplaceClient {

    /** true solo si hay credenciales reales y una implementación que las use. */
    boolean configurado();

    /** Crea la cuenta del negocio en ONVO y devuelve su id y el enlace de onboarding (https). */
    CuentaCreada crearCuenta(Long empresaId, String nombreNegocio, String correo);

    /** Enlace de onboarding vigente para una cuenta ya creada (https). */
    String enlaceOnboarding(String accountId);

    /** Pide a ONVO que reenvíe el enlace de onboarding al correo de la cuenta. */
    void reenviarEnlace(String accountId);

    record CuentaCreada(String accountId, String urlOnboarding) {}

    /** ONVO sin llaves o sin implementación: el caller responde 503 ONVO_NO_CONFIGURADO. */
    class OnvoNoConfiguradoException extends RuntimeException {
        public OnvoNoConfiguradoException() {
            super("Los cobros con ONVO todavía no están configurados. Intentá más tarde.");
        }
    }
}
