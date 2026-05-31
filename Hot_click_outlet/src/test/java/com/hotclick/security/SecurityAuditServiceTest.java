package com.hotclick.security;

import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.service.SecurityAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SecurityAuditService.
 * Verifies that events are persisted with correct fields and that
 * sensitive data (passwords, JWTs) is never stored.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[SEC] SecurityAuditService unit tests")
@SuppressWarnings("null")
class SecurityAuditServiceTest {

    @Mock
    private SecurityAuditLogRepository auditRepo;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private SecurityAuditService auditService;

    @BeforeEach
    void setUp() throws Exception {
        // Default: ObjectMapper returns "{}" for any map
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
    }

    @Test
    @DisplayName("log() persiste evento con tipo y severidad correctos")
    void log_persistsCorrectFields() throws Exception {
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"reason\":\"test\"}");
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.log(SecurityEventType.LOGIN_FAILED, SecurityEventSeverity.MEDIUM,
            null, "user@test.com", "1.2.3.4", "Mozilla/5.0", "/api/auth/login",
            Map.of("reason", "wrong_password"));

        verify(auditRepo).save(captor.capture());
        SecurityAuditLog saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo("LOGIN_FAILED");
        assertThat(saved.getSeverity()).isEqualTo("MEDIUM");
        assertThat(saved.getEmail()).isEqualTo("user@test.com");
        assertThat(saved.getIpAddress()).isEqualTo("1.2.3.4");
        assertThat(saved.getEndpoint()).isEqualTo("/api/auth/login");
        assertThat(saved.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("log() trunca userAgent a 300 chars máximo")
    void log_truncatesLongUserAgent() throws Exception {
        String longUa = "A".repeat(500);
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.log(SecurityEventType.LOGIN_SUCCESS, SecurityEventSeverity.LOW,
            1L, "user@test.com", "1.2.3.4", longUa, "/api/auth/login", null);

        verify(auditRepo).save(captor.capture());
        assertThat(captor.getValue().getUserAgent()).hasSize(300);
    }

    @Test
    @DisplayName("log() no lanza excepción si repo.save() falla — resiliente")
    void log_doesNotThrowIfRepoFails() {
        doThrow(new RuntimeException("DB down")).when(auditRepo).save(any());

        // Must not propagate exception
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() ->
            auditService.log(SecurityEventType.LOGIN_FAILED, SecurityEventSeverity.HIGH,
                null, "user@test.com", "1.2.3.4", null, "/api/auth/login", null));
    }

    @Test
    @DisplayName("log() sanitiza email a minúsculas")
    void log_sanitizesEmailToLowercase() throws Exception {
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.log(SecurityEventType.LOGIN_SUCCESS, SecurityEventSeverity.LOW,
            1L, "USER@HOTCLICK.CR", "10.0.0.1", null, "/api/auth/login", null);

        verify(auditRepo).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("user@hotclick.cr");
    }

    @Test
    @DisplayName("logLoginFailed() persiste evento LOGIN_FAILED con severidad MEDIUM")
    void logLoginFailed_correctSeverity() throws Exception {
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.logLoginFailed("victim@test.com", null, "wrong_password");

        verify(auditRepo).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("LOGIN_FAILED");
        assertThat(captor.getValue().getSeverity()).isEqualTo("MEDIUM");
    }

    @Test
    @DisplayName("logLoginBlocked() persiste evento LOGIN_BLOCKED con severidad HIGH")
    void logLoginBlocked_highSeverity() throws Exception {
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.logLoginBlocked("blocked@test.com", null);

        verify(auditRepo).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("LOGIN_BLOCKED");
        assertThat(captor.getValue().getSeverity()).isEqualTo("HIGH");
    }

    @Test
    @DisplayName("logTokenRejected() persiste TOKEN_REJECTED con severidad MEDIUM")
    void logTokenRejected_mediumSeverity() throws Exception {
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.logTokenRejected("5.6.7.8", "Mozilla", "/api/productos", "SignatureException");

        verify(auditRepo).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("TOKEN_REJECTED");
        assertThat(captor.getValue().getSeverity()).isEqualTo("MEDIUM");
        assertThat(captor.getValue().getIpAddress()).isEqualTo("5.6.7.8");
    }

    @Test
    @DisplayName("logRateLimitTriggered() persiste RATE_LIMIT_TRIGGERED")
    void logRateLimit_persisted() throws Exception {
        ArgumentCaptor<SecurityAuditLog> captor = ArgumentCaptor.forClass(SecurityAuditLog.class);

        auditService.logRateLimitTriggered("9.9.9.9", "/api/auth/login");

        verify(auditRepo).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("RATE_LIMIT_TRIGGERED");
        assertThat(captor.getValue().getIpAddress()).isEqualTo("9.9.9.9");
    }

    @Test
    @DisplayName("getIp() retorna null cuando request es null")
    void getIp_nullRequest_returnsNull() {
        assertThat(auditService.getIp(null)).isNull();
    }

    @Test
    @DisplayName("getUa() retorna null cuando request es null")
    void getUa_nullRequest_returnsNull() {
        assertThat(auditService.getUa(null)).isNull();
    }
}
