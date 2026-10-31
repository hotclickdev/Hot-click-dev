package com.hotclick.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** B1: el login exige el mismo mínimo de 8 caracteres que el alta (antes aceptaba 6). */
class JwtRequestClaveMinimaTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private JwtRequest req(String clave) {
        JwtRequest r = new JwtRequest();
        r.setCorreo("persona@example.com");
        r.setContrasena(clave);
        return r;
    }

    @Test
    void claveDe7_esRechazada() {
        assertThat(validator.validate(req("1234567")))
            .anyMatch(v -> v.getPropertyPath().toString().equals("contrasena"));
    }

    @Test
    void claveDe8_esAceptada() {
        assertThat(validator.validate(req("12345678"))).isEmpty();
    }
}
