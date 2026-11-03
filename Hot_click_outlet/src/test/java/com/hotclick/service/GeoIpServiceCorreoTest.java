package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAuditLogRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** #465: la alerta de GeoIP no filtra el correo en meta.description de logDetection ni en logs. */
class GeoIpServiceCorreoTest {

    private static final String CORREO = "persona.secreta@example.com";

    @Test
    @SuppressWarnings("unchecked")
    void logDetectionNoFiltraCorreoEnDescription() throws Exception {
        SecurityAuditLogRepository repo = mock(SecurityAuditLogRepository.class);
        SecurityAuditService audit = new SecurityAuditService(repo, new ObjectMapper());
        GeoIpService geo = new GeoIpService(mock(SecurityDetectionService.class), audit, new ObjectMapper());

        HttpClient http = mock(HttpClient.class);
        HttpResponse<String> resp = mock(HttpResponse.class);
        when(resp.statusCode()).thenReturn(200);
        when(resp.body()).thenReturn("{\"status\":\"success\",\"country\":\"CR\",\"regionName\":\"SJ\",\"city\":\"SJ\",\"isp\":\"Centro Penitenciario\",\"org\":\"Sistema Penitenciario\"}");
        when(http.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(resp);
        ReflectionTestUtils.setField(geo, "http", http);

        ListAppender<ILoggingEvent> app = new ListAppender<>();
        app.start();
        Logger l1 = (Logger) LoggerFactory.getLogger(GeoIpService.class);
        Logger l2 = (Logger) LoggerFactory.getLogger(SecurityAuditService.class);
        l1.addAppender(app); l2.addAppender(app);
        try {
            ReflectionTestUtils.invokeMethod(geo, "checkGeoIp", "200.1.2.3", 7L, CORREO);
        } finally {
            l1.detachAppender(app); l2.detachAppender(app);
        }

        ArgumentCaptor<SecurityAuditLog> cap = ArgumentCaptor.forClass(SecurityAuditLog.class);
        verify(repo).save(cap.capture());
        String meta = cap.getValue().getMetadata();
        assertThat(meta).contains("description").contains("p***@example.com").doesNotContain("persona.secreta");
        assertThat(app.list).isNotEmpty();
        assertThat(app.list).allSatisfy(e -> assertThat(e.getFormattedMessage()).doesNotContain("persona.secreta"));
    }
}
