package com.hotclick.service.auth;

import com.hotclick.dto.RegisterRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** B1: el mínimo de 8 aplica al crear la cuenta y al cambiar o recuperar la clave (no al login). */
class ClaveMinimaPoliticaTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private boolean altaTieneErrorDeClave(String clave) {
        RegisterRequest r = new RegisterRequest();
        r.setNombre("Ana");
        r.setCorreo("ana@example.com");
        r.setContrasena(clave);
        return validator.validate(r).stream().anyMatch(v -> v.getPropertyPath().toString().equals("contrasena"));
    }

    @Test
    void alta_rechaza7_acepta8() {
        // El largo y la composición los valida AuthRegistrationService (mensaje "Te falta …"); el DTO solo pone el tope.
        assertThat(AuthSupport.faltantePoliticaContrasena("Abcdef1")).isNotNull();
        assertThat(AuthSupport.faltantePoliticaContrasena("Abcdefg1")).isNull();
        assertThat(altaTieneErrorDeClave("A1" + "a".repeat(127))).isTrue();
        assertThat(altaTieneErrorDeClave("Abcdefg1")).isFalse();
    }

    @Test
    void cambioDeClave_rechaza7_acepta8() {
        AuthSupport support = new AuthSupport();
        assertThat(support.esContrasenaValida("Abcdef1")).isFalse();
        assertThat(support.esContrasenaValida("Abcdefg1")).isTrue();
    }

    @Test
    void recuperacion_rechaza7_acepta8() {
        assertThat(AuthSupport.esContrasenaRecuperacionValida("Abcdef1", "ana@example.com")).isFalse();
        assertThat(AuthSupport.esContrasenaRecuperacionValida("Abcdefg1", "ana@example.com")).isTrue();
    }
}
