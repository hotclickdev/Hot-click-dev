package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Comisión gateway | una sola fuente: application.properties")
class GatewayPctSoloConfigTest {

    @Test
    void sinDefaultEnCodigoYConfigDefinida() throws Exception {
        Value v = AggregatorService.class.getDeclaredField("pctGateway").getAnnotation(Value.class);
        assertThat(v.value()).isEqualTo("${hotclick.comision.gateway.pct}");
        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("hotclick.comision.gateway.pct")).isNotBlank().matches("\\d+");
    }
}
