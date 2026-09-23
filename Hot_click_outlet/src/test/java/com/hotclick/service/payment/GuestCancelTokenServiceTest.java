package com.hotclick.service.payment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GuestCancelTokenService")
class GuestCancelTokenServiceTest {

    private GuestCancelTokenService service;

    @BeforeEach
    void setUp() {
        service = new GuestCancelTokenService();
        ReflectionTestUtils.setField(service, "secret", "test-jwt-secret-for-hmac-32chars!!");
    }

    @Test
    @DisplayName("emitir + esValido round-trip")
    void emitirYValidar() {
        String token = service.emitir("ORD-XYZ");
        assertThat(token).isNotBlank();
        assertThat(service.esValido("ORD-XYZ", token)).isTrue();
        assertThat(service.esValido("ORD-OTRO", token)).isFalse();
        assertThat(service.esValido("ORD-XYZ", null)).isFalse();
        assertThat(service.esValido("ORD-XYZ", "")).isFalse();
    }
}
