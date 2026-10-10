package com.hotclick.integration;

import com.hotclick.service.analytics.MetricasPlataformaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MetricasPlataformaIntegrationTest extends BaseIntegrationTest {

    @Autowired private MetricasPlataformaService service;

    @Test
    void consultasJpqlValidasSobreLaBase() {
        Map<String, Object> r = service.traccion(30);
        assertThat(r).containsKeys("negociosActivos", "productosVisibles", "pedidosVendidos", "ventasColones", "onboarding");
        assertThat((List<?>) r.get("onboarding")).hasSize(4);
    }
}