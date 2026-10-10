package com.hotclick.integration;

import com.hotclick.service.SecurityAuditService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QA-122-2: la tabla de auditoría guarda la ruta del enlace enmascarada")
class AuditoriaTokenEnmascaradoTest extends BaseIntegrationTest {

    @Autowired private SecurityAuditService audit;

    @Test
    void rateLimitSinToken() {
        String token = "ZyXwVuTsRqPoNmLkJiHgFeDc";
        audit.logRateLimitTriggered("203.0.113.7", "/api/public/tienda-rapida/" + token);
        var fila = jdbcTemplate.queryForMap(
            "SELECT endpoint, metadata FROM hot_click_security_audit_log_tb WHERE ip_address = '203.0.113.7' ORDER BY 1 DESC LIMIT 1");
        assertThat(String.valueOf(fila.get("endpoint"))).isEqualTo("/api/public/tienda-rapida/ZyXw…");
        assertThat(String.valueOf(fila.get("metadata"))).doesNotContain(token).contains("ZyXw…");
    }
}
