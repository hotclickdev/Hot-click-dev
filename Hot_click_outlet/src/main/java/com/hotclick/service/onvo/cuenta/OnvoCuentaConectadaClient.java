package com.hotclick.service.onvo.cuenta;

/**
 * Cuentas conectadas ONVO (Marketplaces). Contrato según docs.onvopay.com (openapi):
 * POST /v1/connected-accounts {businessName, marketplaceAppFee?} -> {id, mode, status, businessName,
 * marketplaceAppFee, createdAt, onboardingUrl}; GET /v1/connected-accounts/{id} (sin onboardingUrl);
 * POST /v1/connected-accounts/{id}/onboarding-link -> {id, onboardingUrl} (409 si el onboarding ya se completó).
 */
public interface OnvoCuentaConectadaClient {

    record CuentaCreada(String id, String status, String onboardingUrl) {}

    record CuentaEstado(String id, String status) {}

    /** ONVO no configurado (sin llave): nunca se inventa una cuenta. */
    class OnvoNoConfiguradoException extends RuntimeException {
        public OnvoNoConfiguradoException(String m) { super(m); }
    }

    /** El onboarding ya se completó (409 marketplaces.onboarding_already_completed). */
    class OnboardingCompletadoException extends RuntimeException {
        public OnboardingCompletadoException(String m) { super(m); }
    }

    CuentaCreada crear(String businessName);

    CuentaEstado consultar(String accountId);

    String regenerarOnboarding(String accountId);

    boolean isSimulado();
}
