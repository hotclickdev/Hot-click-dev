package com.hotclick.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TilopayServiceMockTest {

    private TilopayService service;

    @BeforeEach
    void setUp() {
        service = servicioConPerfil(true);
    }

    @Test
    void sinCredenciales_enProduccion_rechaza() {
        TilopayService prod = servicioConPerfil(false);

        assertFalse(prod.isMockMode());
        assertFalse(prod.isPagosDisponibles());
        assertThrows(IllegalStateException.class, prod::loginSdk);
        var consulta = prod.consultarTransaccion("ORD-OK");
        assertFalse(consulta.aprobada());
        assertFalse(consulta.simulada());
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

    @Test
    void parseConsulta_leeMontoMonedaYOrden() {
        var body = java.util.Map.<String, Object>of(
            "response", java.util.List.of(java.util.Map.of(
                "code", "1",
                "amount", "10000.00",
                "currency", "CRC",
                "orderNumber", "ORD-ABC"
            ))
        );
        var r = TilopayService.parseConsulta(body);
        assertEquals(0, r.amount().compareTo(new BigDecimal("10000.00")));
        assertEquals("CRC", r.currency());
        assertEquals("ORD-ABC", r.orderNumber());
        assertFalse(r.simulada());
    }

    private static TilopayService servicioConPerfil(boolean devOTest) {
        TilopayService creado = new TilopayService();
        Environment environment = mock(Environment.class);
        when(environment.acceptsProfiles(any(Profiles.class))).thenReturn(devOTest);
        ReflectionTestUtils.setField(creado, "environment", environment);
        ReflectionTestUtils.setField(creado, "apiUser", "");
        ReflectionTestUtils.setField(creado, "password", "");
        ReflectionTestUtils.setField(creado, "apiKey", "");
        ReflectionTestUtils.setField(creado, "baseUrl", "https://app.tilopay.com");
        creado.init();
        return creado;
    }
}
