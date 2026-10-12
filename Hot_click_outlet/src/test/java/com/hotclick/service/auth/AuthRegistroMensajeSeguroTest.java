package com.hotclick.service.auth;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;

/** P1-04: errores de base de datos no llegan al cliente (sin SQL ni nombres de columnas). */
class AuthRegistroMensajeSeguroTest {

    @Test
    void sqlSeOculta_reglaDeNegocioSePasa() {
        String generico = "No se pudo completar el registro.";
        DataIntegrityViolationException sql = new DataIntegrityViolationException(
            "could not execute statement [ERROR: null value in column \"apellido_paterno\"] [insert into hot_click_usuario_tb ...]");
        assertThat(AuthRegistrationService.mensajeSeguro(sql, generico)).isEqualTo(generico);
        assertThat(AuthRegistrationService.mensajeSeguro(new RuntimeException("org.postgresql..."), generico)).isEqualTo(generico);
        assertThat(AuthRegistrationService.mensajeSeguro(new IllegalArgumentException("El correo ya está registrado"), generico))
            .isEqualTo("El correo ya está registrado");
    }
}
