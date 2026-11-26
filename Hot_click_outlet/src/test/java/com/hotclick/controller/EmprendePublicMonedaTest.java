package com.hotclick.controller;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** /api/public/emprende/cupos publica el monto con la moneda configurada (PLANES_MONEDA), sin asumir USD. */
class EmprendePublicMonedaTest {

    private Map<String, Object> cupos(PreciosPlanesConfig precios) {
        CupoEmprendedorService svc = mock(CupoEmprendedorService.class);
        when(svc.estadoPublico()).thenReturn(new CupoEmprendedorEstado(10, 70, 60, "3 meses"));
        return new EmprendePublicController(svc, precios).cupos();
    }

    @Test
    @DisplayName("CRC: mensualidadUsdSinCupo en colones y moneda CRC")
    void crc() {
        Map<String, Object> m = cupos(new PreciosPlanesConfig("5900", "12900", "24900", "crc"));
        assertThat(m).containsEntry("mensualidadUsdSinCupo", new BigDecimal("5900")).containsEntry("moneda", "CRC");
    }

    @Test
    @DisplayName("USD: monto en dólares y moneda USD")
    void usd() {
        Map<String, Object> m = cupos(new PreciosPlanesConfig("9", "24", "49", "USD"));
        assertThat(m).containsEntry("mensualidadUsdSinCupo", new BigDecimal("9")).containsEntry("moneda", "USD");
    }

    @Test
    @DisplayName("Sin moneda configurada: moneda null (la UI no asume ninguna)")
    void sinMoneda() {
        Map<String, Object> m = cupos(new PreciosPlanesConfig("9", "24", "49"));
        assertThat(m).containsEntry("moneda", null);
    }
}
