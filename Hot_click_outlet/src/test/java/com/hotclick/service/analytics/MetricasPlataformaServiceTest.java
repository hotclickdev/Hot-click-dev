package com.hotclick.service.analytics;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MetricasPlataformaServiceTest {

    @Test
    void embudoCalculaPorcentajesYCaidas() {
        List<Map<String, Object>> e = MetricasPlataformaService.embudo(10, 8, 5, 2);
        assertThat(e).extracting(m -> m.get("paso")).containsExactly("REGISTRO", "BODEGA", "PRIMER_PRODUCTO", "PRIMERA_VENTA");
        assertThat(e.get(1).get("porcentaje")).isEqualTo(80.0);
        assertThat(e.get(2).get("seVan")).isEqualTo(3L);
        assertThat(e.get(3).get("porcentaje")).isEqualTo(20.0);
    }

    @Test
    void sinRegistrosNoInventaPorcentajes() {
        assertThat(MetricasPlataformaService.embudo(0, 0, 0, 0).get(0).get("porcentaje")).isNull();
    }
}