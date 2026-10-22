package com.hotclick.service.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AuthCredentialLoginHandlerMascaraTest {

    @Test
    void enmascaraCorreo() {
        assertThat(AuthCredentialLoginHandler.enmascararCorreo("ana@example.com")).isEqualTo("a***@example.com");
        assertThat(AuthCredentialLoginHandler.enmascararCorreo("sin-arroba")).isEqualTo("***");
        assertThat(AuthCredentialLoginHandler.enmascararCorreo(null)).isEqualTo("***");
    }
}
