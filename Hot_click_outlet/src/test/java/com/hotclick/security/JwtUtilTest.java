package com.hotclick.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

@DisplayName("JwtUtil — unit tests")
class JwtUtilTest {

    private JwtUtil jwtUtil;

    private static final String SECRET = "hotclick-unit-test-secret-key-at-least-32-chars-for-hs256";
    private static final String EMAIL  = "user@hotclick.cr";

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secretKey", SECRET);
    }

    // ── generateToken / extractUsername ──────────────────────────────────────

    @Test
    @DisplayName("extractRol → returns rol from claims")
    void extractRol_returnsRol() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "EMPRENDEDOR");
        assertThat(jwtUtil.extractRol(token)).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("generateToken → extractUsername returns same email")
    void generateToken_extractUsername_match() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "USUARIO_FINAL");
        assertThat(jwtUtil.extractUsername(token)).isEqualTo(EMAIL);
    }

    @Test
    @DisplayName("validateToken → true for valid token + correct username")
    void validateToken_valid_returnsTrue() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "USUARIO_FINAL");
        assertThat(jwtUtil.validateToken(token, EMAIL)).isTrue();
    }

    @Test
    @DisplayName("validateToken → false for wrong username")
    void validateToken_wrongUsername_returnsFalse() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "USUARIO_FINAL");
        assertThat(jwtUtil.validateToken(token, "other@hotclick.cr")).isFalse();
    }

    @Test
    @DisplayName("extractUserId → returns Long ID from claims")
    void extractUserId_returnsCorrectLong() {
        String token = jwtUtil.generateToken(EMAIL, 42L, "ADMIN_IT");
        assertThat(jwtUtil.extractUserId(token)).isEqualTo(42L);
    }

    @Test
    @DisplayName("extractUserId → works with large IDs")
    void extractUserId_largeId_correct() {
        long largeId = 9_999_999L;
        String token = jwtUtil.generateToken(EMAIL, largeId, "USUARIO_FINAL");
        assertThat(jwtUtil.extractUserId(token)).isEqualTo(largeId);
    }

    // ── Temp token (2FA) ─────────────────────────────────────────────────────

    @Test
    @DisplayName("generateTempToken → isTempToken returns true")
    void generateTempToken_isTempToken_true() {
        String temp = jwtUtil.generateTempToken(EMAIL, 1L);
        assertThat(jwtUtil.isTempToken(temp)).isTrue();
    }

    @Test
    @DisplayName("normal token → isTempToken returns false")
    void isTempToken_normalToken_false() {
        String normal = jwtUtil.generateToken(EMAIL, 1L, "USUARIO_FINAL");
        assertThat(jwtUtil.isTempToken(normal)).isFalse();
    }

    @Test
    @DisplayName("generateTempToken → extractUsername returns correct email")
    void tempToken_extractUsername_correct() {
        String temp = jwtUtil.generateTempToken("admin@hotclick.cr", 99L);
        assertThat(jwtUtil.extractUsername(temp)).isEqualTo("admin@hotclick.cr");
    }

    @Test
    @DisplayName("generateTempToken → extractUserId returns correct id")
    void tempToken_extractUserId_correct() {
        String temp = jwtUtil.generateTempToken(EMAIL, 7L);
        assertThat(jwtUtil.extractUserId(temp)).isEqualTo(7L);
    }

    @Test
    @DisplayName("isTempToken → false for malformed token")
    void isTempToken_malformedToken_false() {
        assertThat(jwtUtil.isTempToken("this.is.not.valid")).isFalse();
    }

    @Test
    @DisplayName("extractAllClaims → throws on tampered token")
    void tamperedToken_throwsException() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "USUARIO_FINAL");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";
        assertThatThrownBy(() -> jwtUtil.validateToken(tampered, EMAIL))
            .isInstanceOf(Exception.class);
    }

    // ── EmpresaSelectionToken (single-purpose — must NOT act as full auth) ───

    @Test
    @DisplayName("generateEmpresaSelectionToken → isEmpresaSelectionToken returns true")
    void generateEmpresaSelectionToken_isEmpresaSelectionToken_true() {
        String token = jwtUtil.generateEmpresaSelectionToken(EMAIL, 1L);
        assertThat(jwtUtil.isEmpresaSelectionToken(token)).isTrue();
    }

    @Test
    @DisplayName("normal token → isEmpresaSelectionToken returns false")
    void normalToken_isNotEmpresaSelectionToken() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "EMPRENDEDOR");
        assertThat(jwtUtil.isEmpresaSelectionToken(token)).isFalse();
    }

    @Test
    @DisplayName("tempToken (2FA) → isEmpresaSelectionToken returns false")
    void tempToken_isNotEmpresaSelectionToken() {
        String temp = jwtUtil.generateTempToken(EMAIL, 1L);
        assertThat(jwtUtil.isEmpresaSelectionToken(temp)).isFalse();
    }

    @Test
    @DisplayName("isEmpresaSelectionToken → false for malformed token")
    void isEmpresaSelectionToken_malformedToken_false() {
        assertThat(jwtUtil.isEmpresaSelectionToken("garbage.token.here")).isFalse();
    }

    @Test
    @DisplayName("empresaSelectionToken carries correct userId")
    void empresaSelectionToken_extractUserId_correct() {
        String token = jwtUtil.generateEmpresaSelectionToken(EMAIL, 55L);
        assertThat(jwtUtil.extractUserId(token)).isEqualTo(55L);
    }

    @Test
    @DisplayName("empresaSelectionToken carries correct username (email)")
    void empresaSelectionToken_extractUsername_correct() {
        String token = jwtUtil.generateEmpresaSelectionToken("biz@hotclick.cr", 9L);
        assertThat(jwtUtil.extractUsername(token)).isEqualTo("biz@hotclick.cr");
    }

    // ── empresaId / empresaSlug claims ───────────────────────────────────────

    @Test
    @DisplayName("generateToken with empresa → extractEmpresaId returns correct id")
    void generateToken_withEmpresa_extractEmpresaId() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "EMPRENDEDOR", 42L, "mi-tienda");
        assertThat(jwtUtil.extractEmpresaId(token)).isEqualTo(42L);
    }

    @Test
    @DisplayName("generateToken with empresa → extractEmpresaSlug returns correct slug")
    void generateToken_withEmpresa_extractEmpresaSlug() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "EMPRENDEDOR", 42L, "mi-tienda");
        assertThat(jwtUtil.extractEmpresaSlug(token)).isEqualTo("mi-tienda");
    }

    @Test
    @DisplayName("generateToken without empresa → extractEmpresaId returns null")
    void generateToken_withoutEmpresa_extractEmpresaIdNull() {
        String token = jwtUtil.generateToken(EMAIL, 1L, "USUARIO_FINAL");
        assertThat(jwtUtil.extractEmpresaId(token)).isNull();
    }
}
