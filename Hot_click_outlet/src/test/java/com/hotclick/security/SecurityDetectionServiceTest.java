package com.hotclick.security;

import com.hotclick.model.SecurityAlert;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.SecurityDetectionService;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SecurityDetectionService.
 *
 * Verifies that:
 *  - Brute force is detected after threshold failed logins from same IP
 *  - Password spray is detected after 3+ distinct targets from same IP
 *  - JWT scanning is detected after 15+ invalid JWTs from same IP
 *  - OTP flood is detected after 5+ OTP requests for same user
 *  - Alert deduplication (cooldown) prevents alert spam
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[SEC] SecurityDetectionService attack detection tests")
@SuppressWarnings("null")
class SecurityDetectionServiceTest {

    @Mock private SecurityAlertRepository alertRepo;
    @Mock private SecurityAuditService    auditService;

    @InjectMocks
    private SecurityDetectionService detectionService;

    @BeforeEach
    void setUp() {
        when(alertRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    // ── Brute Force ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Brute force: 5 failed logins from same IP → HIGH alert generated")
    void bruteForce_fiveFailedLogins_triggersAlert() {
        String ip = "192.168.1.100";

        for (int i = 0; i < 5; i++) {
            detectionService.recordFailedLogin(ip, "victim@test.com");
        }

        ArgumentCaptor<SecurityAlert> captor = ArgumentCaptor.forClass(SecurityAlert.class);
        verify(alertRepo, atLeastOnce()).save(captor.capture());

        boolean hasBruteForce = captor.getAllValues().stream()
            .anyMatch(a -> "BRUTE_FORCE".equals(a.getAlertType()) || "CREDENTIAL_STUFFING".equals(a.getAlertType()));
        assertThat(hasBruteForce).isTrue();
    }

    @Test
    @DisplayName("Brute force: 4 failed logins from same IP → NO alert (below threshold)")
    void bruteForce_fourFailedLogins_noAlert() {
        String ip = "192.168.1.101";

        for (int i = 0; i < 4; i++) {
            detectionService.recordFailedLogin(ip, "victim@test.com");
        }

        verify(alertRepo, never()).save(any());
    }

    @Test
    @DisplayName("Brute force: different IPs → alerts are independent")
    void bruteForce_differentIps_independent() {
        // 4 from ip1 + 4 from ip2 → no alert (each below threshold independently)
        for (int i = 0; i < 4; i++) {
            detectionService.recordFailedLogin("10.0.0.1", "victim@test.com");
            detectionService.recordFailedLogin("10.0.0.2", "victim@test.com");
        }

        verify(alertRepo, never()).save(any());
    }

    // ── Password Spray ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Password spray: 3 different accounts from same IP → HIGH alert")
    void passwordSpray_threeDistinctTargets_triggersAlert() {
        String ip = "203.0.113.5";

        detectionService.recordFailedLogin(ip, "user1@test.com");
        detectionService.recordFailedLogin(ip, "user2@test.com");
        detectionService.recordFailedLogin(ip, "user3@test.com");

        ArgumentCaptor<SecurityAlert> captor = ArgumentCaptor.forClass(SecurityAlert.class);
        verify(alertRepo, atLeastOnce()).save(captor.capture());

        boolean hasSpray = captor.getAllValues().stream()
            .anyMatch(a -> "PASSWORD_SPRAY".equals(a.getAlertType()));
        assertThat(hasSpray).isTrue();
    }

    @Test
    @DisplayName("Password spray: same target repeated → no spray alert")
    void passwordSpray_sameTargetRepeated_noSprayAlert() {
        String ip = "203.0.113.6";

        // 5 attempts against same account — brute force, NOT spray
        for (int i = 0; i < 4; i++) {
            detectionService.recordFailedLogin(ip, "victim@test.com");
        }

        ArgumentCaptor<SecurityAlert> captor = ArgumentCaptor.forClass(SecurityAlert.class);
        // Either no alert or only brute force — never spray
        if (!captor.getAllValues().isEmpty()) {
            boolean hasSpray = captor.getAllValues().stream()
                .anyMatch(a -> "PASSWORD_SPRAY".equals(a.getAlertType()));
            assertThat(hasSpray).isFalse();
        }
    }

    // ── JWT Scanning ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("JWT scanning: 15 invalid JWTs from same IP → MEDIUM alert")
    void jwtScanning_fifteenInvalidJwts_triggersAlert() {
        String ip = "198.51.100.1";

        for (int i = 0; i < 15; i++) {
            detectionService.recordInvalidJwt(ip);
        }

        ArgumentCaptor<SecurityAlert> captor = ArgumentCaptor.forClass(SecurityAlert.class);
        verify(alertRepo, atLeastOnce()).save(captor.capture());

        boolean hasJwtScan = captor.getAllValues().stream()
            .anyMatch(a -> "JWT_SCANNING".equals(a.getAlertType()));
        assertThat(hasJwtScan).isTrue();
    }

    @Test
    @DisplayName("JWT scanning: 14 invalid JWTs → no alert (below threshold)")
    void jwtScanning_fourteenJwts_noAlert() {
        String ip = "198.51.100.2";

        for (int i = 0; i < 14; i++) {
            detectionService.recordInvalidJwt(ip);
        }

        verify(alertRepo, never()).save(any());
    }

    // ── OTP Flood ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("OTP flood: 5 OTP requests for same user → MEDIUM alert")
    void otpFlood_fiveRequests_triggersAlert() {
        Long userId = 42L;

        for (int i = 0; i < 5; i++) {
            detectionService.recordOtpRequest(userId);
        }

        ArgumentCaptor<SecurityAlert> captor = ArgumentCaptor.forClass(SecurityAlert.class);
        verify(alertRepo, atLeastOnce()).save(captor.capture());

        boolean hasOtpFlood = captor.getAllValues().stream()
            .anyMatch(a -> "OTP_FLOOD".equals(a.getAlertType()));
        assertThat(hasOtpFlood).isTrue();
    }

    @Test
    @DisplayName("OTP flood: 4 requests → no alert (below threshold)")
    void otpFlood_fourRequests_noAlert() {
        Long userId = 99L;

        for (int i = 0; i < 4; i++) {
            detectionService.recordOtpRequest(userId);
        }

        verify(alertRepo, never()).save(any());
    }

    // ── Null safety ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("recordFailedLogin with null IP → no NullPointerException")
    void recordFailedLogin_nullIp_safe() {
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> detectionService.recordFailedLogin(null, "victim@test.com"));
        verify(alertRepo, never()).save(any());
    }

    @Test
    @DisplayName("recordInvalidJwt with null IP → no NullPointerException")
    void recordInvalidJwt_nullIp_safe() {
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> detectionService.recordInvalidJwt(null));
        verify(alertRepo, never()).save(any());
    }

    @Test
    @DisplayName("recordOtpRequest with null userId → no NullPointerException")
    void recordOtpRequest_nullUserId_safe() {
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> detectionService.recordOtpRequest(null));
        verify(alertRepo, never()).save(any());
    }
}
