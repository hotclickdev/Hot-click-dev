package com.hotclick.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TilopayServiceMockTest {

    private TilopayService service;

    @BeforeEach
    void setUp() {
        service = new TilopayService();
        ReflectionTestUtils.setField(service, "apiUser", "");
        ReflectionTestUtils.setField(service, "password", "");
        ReflectionTestUtils.setField(service, "apiKey", "");
        ReflectionTestUtils.setField(service, "baseUrl", "https://app.tilopay.com");
        service.init();
    }

    @Test
    void mockMode_sinCredenciales() {
        assertTrue(service.isMockMode());
        assertEquals("mock-sdk-token", service.loginSdk());
    }

    @Test
    void consultar_mockAprueba() {
        var r = service.consultarTransaccion("ORD-OK");
        assertTrue(r.aprobada());
        assertEquals("1", r.code());
    }

    @Test
    void consultar_mockRechazaConFail() {
        var r = service.consultarTransaccion("ORD-FAIL");
        assertFalse(r.aprobada());
    }

    @Test
    void parseConsulta_leeCodeDelArrayResponse() {
        var body = java.util.Map.<String, Object>of(
            "type", "200",
            "response", java.util.List.of(java.util.Map.of(
                "code", "1",
                "response", "Transacción aprobada",
                "auth", "123456"
            ))
        );
        var r = TilopayService.parseConsulta(body);
        assertTrue(r.aprobada());
        assertEquals("1", r.code());
        assertEquals("123456", r.auth());
    }
}
