package com.hotclick.service.negocio;

import org.springframework.stereotype.Component;

/** Bean por defecto sin llaves de ONVO: siempre falla cerrado; no hay modo simulado. */
@Component
public class MensualidadCheckoutNoConfigurado implements MensualidadCheckoutClient {

    @Override public boolean configurado() { return false; }

    @Override public String crearCheckout(Long empresaId, String planNombre, int montoCrc) {
        throw new NoConfiguradoException();
    }
}
