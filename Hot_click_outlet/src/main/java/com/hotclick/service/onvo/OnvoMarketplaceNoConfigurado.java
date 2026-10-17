package com.hotclick.service.onvo;

import org.springframework.stereotype.Component;

/**
 * Bean por defecto de {@link OnvoMarketplaceClient} mientras no haya llaves sandbox ni cliente real:
 * falla cerrado en todas las operaciones (PAG-6). No hay modo simulado.
 */
@Component
public class OnvoMarketplaceNoConfigurado implements OnvoMarketplaceClient {

    @Override public boolean configurado() { return false; }

    @Override public CuentaCreada crearCuenta(Long empresaId, String nombreNegocio, String correo) {
        throw new OnvoNoConfiguradoException();
    }

    @Override public String enlaceOnboarding(String accountId) { throw new OnvoNoConfiguradoException(); }

    @Override public void reenviarEnlace(String accountId) { throw new OnvoNoConfiguradoException(); }
}
