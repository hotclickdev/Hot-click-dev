package com.hotclick.service.auth;

import com.hotclick.controller.WebAuthnController;
import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.OtpService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.WebAuthnService;
import com.hotclick.security.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Una cuenta con estado distinto de 1 no recibe tokens por ningún camino que los emite: login con contraseña
 * (buildAuthResponse), 2FA (TOTP, correo y código de recuperación), Clerk y WebAuthn. La respuesta es genérica:
 * no revela si la cuenta está eliminada, suspendida, inactiva o pendiente. Datos ficticios.
 * Los asserts usan solo la API pública que ya existía, para correr igual contra el código anterior.
 */
@DisplayName("Cuentas no activas no reciben tokens (BAJO de Seguridad sobre #389)")
class CuentaNoActivaNoRecibeTokensTest {

    private static final String GENERICO = "Credenciales inválidas";

    private JwtUtil jwtUtil;
    private RefreshTokenService refreshTokenService;
    private PermisoRepository permisoRepository;
    private RateLimiter rateLimiter;
    private AuthSupport authSupport;

    @BeforeEach
    void preparar() {
        jwtUtil = mock(JwtUtil.class);
        refreshTokenService = mock(RefreshTokenService.class);
        permisoRepository = mock(PermisoRepository.class);
        rateLimiter = mock(RateLimiter.class);
        when(rateLimiter.tryAcquireEstricto(anyString(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt()))
            .thenReturn(true);
        when(jwtUtil.generateTokenFull(anyString(), anyLong(), anyString(), any(), any(), anyList())).thenReturn("jwt-fict");
        RefreshToken rt = new RefreshToken();
        rt.setToken("hash-fict");
        rt.setRawToken("refresh-fict");
        when(refreshTokenService.crear(any(Usuario.class))).thenReturn(rt);
        when(permisoRepository.findPermisosByUsuarioId(anyLong())).thenReturn(List.of());
        authSupport = new AuthSupport();
        ReflectionTestUtils.setField(authSupport, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(authSupport, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(authSupport, "permisoRepository", permisoRepository);
        ReflectionTestUtils.setField(authSupport, "rateLimiter", rateLimiter);
        ReflectionTestUtils.setField(authSupport, "clientIpResolver", mock(com.hotclick.security.ClientIpResolver.class));
    }

    private static Usuario usuario(Integer estado) {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setCorreo("persona.ficticia@ejemplo.test");
        u.setNombre("Persona");
        u.setEstado(estado);
        return u;
    }

    private void sinTokens() {
        verify(jwtUtil, never()).generateTokenFull(anyString(), anyLong(), anyString(), any(), any(), anyList());
        verify(refreshTokenService, never()).crear(any(Usuario.class));
    }

    // ── buildAuthResponse: el punto central ─────────────────────────────────────────

    @ParameterizedTest(name = "estado {0} → sin tokens")
    @ValueSource(ints = {2, 3, 4, 5, 0, 9})
    @DisplayName("buildAuthResponse rechaza cualquier estado distinto de 1, con mensaje genérico")
    void buildAuthResponseRechazaEstadosNoActivos(int estado) {
        assertThatThrownBy(() -> authSupport.buildAuthResponse(usuario(estado)))
            .isInstanceOf(SecurityException.class)
            .hasMessage(GENERICO);
        sinTokens();
    }

    @ParameterizedTest
    @NullSource
    @DisplayName("buildAuthResponse rechaza una cuenta sin estado (falla cerrado)")
    void buildAuthResponseRechazaSinEstado(Integer estado) {
        assertThatThrownBy(() -> authSupport.buildAuthResponse(usuario(estado)))
            .isInstanceOf(SecurityException.class)
            .hasMessage(GENERICO);
        sinTokens();
    }

    @Test
    @DisplayName("control: la cuenta activa sí recibe tokens")
    void cuentaActivaRecibeTokens() {
        AuthResponse r = authSupport.buildAuthResponse(usuario(1));
        assertThat(r.getAccessToken()).isEqualTo("jwt-fict");
    }

    // ── 2FA ─────────────────────────────────────────────────────────────────────────

    private AuthTotpVerifyHandler totp(Usuario u, TwoFactorService dosFactores) {
        UsuarioService usuarioService = mock(UsuarioService.class);
        when(jwtUtil.isTempToken("temp")).thenReturn(true);
        when(jwtUtil.extractUsername("temp")).thenReturn(u.getCorreo());
        when(usuarioService.buscarPorCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        AuthTotpVerifyHandler h = new AuthTotpVerifyHandler();
        ReflectionTestUtils.setField(h, "usuarioService", usuarioService);
        ReflectionTestUtils.setField(h, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(h, "twoFactorService", dosFactores);
        ReflectionTestUtils.setField(h, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(h, "otpService", mock(OtpService.class));
        ReflectionTestUtils.setField(h, "securityAuditService", mock(SecurityAuditService.class));
        ReflectionTestUtils.setField(h, "authSupport", authSupport);
        return h;
    }

    @ParameterizedTest(name = "TOTP válido de una cuenta en estado {0} → 401 genérico")
    @ValueSource(ints = {2, 3, 4, 5})
    @DisplayName("2FA TOTP: código correcto pero cuenta no activa → 401 genérico y sin tokens")
    void totpCuentaNoActivaNoRecibeTokens(int estado) {
        Usuario u = usuario(estado);
        TwoFactorService dosFactores = mock(TwoFactorService.class);
        when(dosFactores.verifyCodeWithReplayProtection(any(Usuario.class), anyString())).thenReturn(true);
        ResponseEntity<?> r = totp(u, dosFactores).verify2FA(
            Map.of("tempToken", "temp", "code", "123456"), mock(HttpServletRequest.class));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        assertThat(((ResponseDTO) r.getBody()).getMessage()).isEqualTo(GENERICO);
        sinTokens();
    }

    @Test
    @DisplayName("2FA con código de recuperación: cuenta no activa → 401 genérico, sin tokens y sin gastar el código")
    void recoveryCuentaNoActivaNoRecibeTokens() {
        Usuario u = usuario(3);
        TwoFactorService dosFactores = mock(TwoFactorService.class);
        ResponseEntity<?> r = totp(u, dosFactores).verify2FA(
            Map.of("tempToken", "temp", "recoveryCode", "ABCD-EFGH"), mock(HttpServletRequest.class));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        assertThat(((ResponseDTO) r.getBody()).getMessage()).isEqualTo(GENERICO);
        sinTokens();
        verify(dosFactores, never()).codesToJson(any());
    }

    @Test
    @DisplayName("control: TOTP válido de una cuenta activa → 200 con tokens")
    void totpCuentaActivaRecibeTokens() {
        Usuario u = usuario(1);
        TwoFactorService dosFactores = mock(TwoFactorService.class);
        when(dosFactores.verifyCodeWithReplayProtection(any(Usuario.class), anyString())).thenReturn(true);
        ResponseEntity<?> r = totp(u, dosFactores).verify2FA(
            Map.of("tempToken", "temp", "code", "123456"), mock(HttpServletRequest.class));
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody()).isInstanceOf(AuthResponse.class);
    }

    // ── Clerk ───────────────────────────────────────────────────────────────────────

    private ClerkSyncService clerk(UsuarioRepository repo) {
        ClerkSyncService s = new ClerkSyncService();
        ReflectionTestUtils.setField(s, "usuarioRepository", repo);
        ReflectionTestUtils.setField(s, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(s, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(s, "authSupport", authSupport);
        return s;
    }

    @ParameterizedTest(name = "Clerk con la cuenta vinculada en estado {0} → sin tokens")
    @ValueSource(ints = {2, 4, 5})
    @DisplayName("Clerk: cuenta ya vinculada pero no activa → rechazada, sin tokens ni ultimoAcceso")
    void clerkCuentaVinculadaNoActiva(int estado) {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(estado);
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.of(u));
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "", true))
            .isInstanceOf(SecurityException.class);
        sinTokens();
        verify(repo, never()).updateUltimoAcceso(anyLong(), any());
    }

    @Test
    @DisplayName("Clerk: cuenta existente por correo pero suspendida → rechazada con mensaje genérico, sin tokens")
    void clerkCuentaPorCorreoSuspendida() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(4);
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.empty());
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        assertThatThrownBy(() -> clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "", true))
            .isInstanceOf(SecurityException.class)
            .hasMessage(GENERICO);
        sinTokens();
    }

    @Test
    @DisplayName("control: Clerk con cuenta activa vinculada → tokens")
    void clerkCuentaActiva() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(1);
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.of(u));
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        AuthResponse r = clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "", true);
        assertThat(r.getAccessToken()).isEqualTo("jwt-fict");
    }

    // ── WebAuthn ────────────────────────────────────────────────────────────────────

    /** Construye el controlador con lo que su constructor pida (el código anterior no pedía AuthSupport). */
    private WebAuthnController webauthn(WebAuthnService svc, UsuarioRepository repo) throws Exception {
        Object[] candidatos = {svc, repo, jwtUtil, refreshTokenService, permisoRepository, authSupport};
        Constructor<?> c = WebAuthnController.class.getConstructors()[0];
        Object[] args = Arrays.stream(c.getParameterTypes())
            .map(t -> Arrays.stream(candidatos).filter(t::isInstance).findFirst().orElse(null))
            .toArray();
        return (WebAuthnController) c.newInstance(args);
    }

    @ParameterizedTest(name = "WebAuthn válido de una cuenta en estado {0} → 401 genérico")
    @ValueSource(ints = {2, 3, 4, 5})
    @DisplayName("WebAuthn: llave válida pero cuenta no activa → 401 genérico y sin tokens")
    void webauthnCuentaNoActiva(int estado) throws Exception {
        WebAuthnService svc = mock(WebAuthnService.class);
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(estado);
        when(svc.finishAuthentication(eq(u.getCorreo()), anyString())).thenReturn(true);
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        ResponseEntity<?> r = webauthn(svc, repo).loginFinish(Map.of("email", u.getCorreo(), "response", "{}"));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        assertThat(String.valueOf(r.getBody())).contains("Autenticación WebAuthn fallida");
        sinTokens();
    }

    @Test
    @DisplayName("control: WebAuthn válido de una cuenta activa → 200 con token")
    void webauthnCuentaActiva() throws Exception {
        WebAuthnService svc = mock(WebAuthnService.class);
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(1);
        when(svc.finishAuthentication(eq(u.getCorreo()), anyString())).thenReturn(true);
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        ResponseEntity<?> r = webauthn(svc, repo).loginFinish(Map.of("email", u.getCorreo(), "response", "{}"));
        assertThat(r.getStatusCode().value()).isEqualTo(200);
    }
}
