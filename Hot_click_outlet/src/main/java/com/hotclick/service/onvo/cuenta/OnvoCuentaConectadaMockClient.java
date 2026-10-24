package com.hotclick.service.onvo.cuenta;

import java.util.UUID;

/** Simulación local. Solo se instancia con perfil (dev | test) & !prod & !production (ver config). */
public class OnvoCuentaConectadaMockClient implements OnvoCuentaConectadaClient {

    @Override
    public CuentaCreada crear(String businessName) {
        String id = "ca_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        return new CuentaCreada(id, "pending_onboarding", "https://onvopay.com/setup/mock_" + id);
    }

    @Override
    public CuentaEstado consultar(String accountId) {
        return new CuentaEstado(accountId, "pending_onboarding");
    }

    @Override
    public String regenerarOnboarding(String accountId) {
        return "https://onvopay.com/setup/mock_" + accountId + "_" + System.currentTimeMillis();
    }

    @Override
    public boolean isSimulado() { return true; }
}
