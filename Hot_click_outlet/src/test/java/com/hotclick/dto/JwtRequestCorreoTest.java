package com.hotclick.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Login con espacios alrededor del correo: se normaliza antes de validar (antes daba 400). */
class JwtRequestCorreoTest {

    @Test
    void correoConEspaciosYMayusculas_validaYSeNormaliza() throws Exception {
        JwtRequest r = new ObjectMapper().readValue(
            "{\"correo\":\"  Persona@Example.com \",\"contrasena\":\"secreta123\"}", JwtRequest.class);
        assertThat(r.getCorreo()).isEqualTo("persona@example.com");
        Validator v = Validation.buildDefaultValidatorFactory().getValidator();
        assertThat(v.validate(r)).isEmpty();
    }
}
