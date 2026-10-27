package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.JwtUtil;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.OtpService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BAJOS de Seguridad sobre #393: una cuenta con estado distinto de 1 no recibe tokens al elegir negocio, no recibe el
 * código OTP por correo y no queda vinculada ni modificada por Clerk; y el rechazo es siempre el genérico, sin
 * revelar que la cuenta fue cerrada. Los asserts usan solo la API que ya existía: corren igual contra el código
 * anterior. Datos ficticios.
 */
@DisplayName("Cuentas no activas: seleccionar-empresa, OTP por correo y Clerk (BAJOS de Seguridad sobre #393)")
class CuentaNoActivaTenantOtpClerkTest {

    private static final String GENERICO = "Credenciales inválidas";
    private static final String TOKEN_EXPIRADO = "Token expirado o inválido";

    private JwtUtil jwtUtil;
    private RefreshTokenService refreshTokenService;
    private AuthSupport authSupport;

    @BeforeEach
    void preparar() {
        jwtUtil = mock(JwtUtil.class);
        refreshTokenService = mock(RefreshTokenService.class);
        PermisoRepository permisoRepository = mock(PermisoRepository.class);
        RateLimiter rateLimiter = mock(RateLimiter.class);
        when(rateLimiter.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(jwtUtil.generateTokenFull(anyString(), anyLong(), anyString(), any(), any(), anyList())).thenReturn("jwt-fict");
        when(jwtUtil.generateToken(anyString(), anyLong(), anyString(), any(), any())).thenReturn("jwt-negocio-fict");
        RefreshToken rt = new RefreshToken();
        rt.setToken("hash-fict");
        rt.setRawToken("refresh-fict");
        when(refreshTokenService.crear(any(Usuario.class))).thenReturn(rt);
        when(refreshTokenService.crear(any(Usuario.class), anyLong())).thenReturn(rt);
        when(permisoRepository.findPermisosByUsuarioId(anyLong())).thenReturn(List.of());
        authSupport = new AuthSupport();
        ReflectionTestUtils.setField(authSupport, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(authSupport, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(authSupport, "permisoRepository", permisoRepository);
        ReflectionTestUtils.setField(authSupport, "rateLimiter", rateLimiter);
        ReflectionTestUtils.setField(authSupport, "clientIpResolver", mock(ClientIpResolver.class));
    }

    private static Usuario usuario(Integer estado) {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setCorreo("persona.ficticia@ejemplo.test");
        u.setNombre("Persona");
        u.setEstado(estado);
        return u;
    }

    // ── 1. /api/auth/seleccionar-empresa ────────────────────────────────────────────

    private AuthTenantSwitchHandler tenant(Usuario u, MiembroEmpresaRepository miembros) {
        UsuarioService usuarioService = mock(UsuarioService.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(jwtUtil.isEmpresaSelectionToken("temp")).thenReturn(true);
        when(jwtUtil.extractUserId("temp")).thenReturn(u.getId());
        when(usuarioService.buscarPorId(u.getId())).thenReturn(Optional.of(u));
        Empresa empresa = new Empresa();
        empresa.setId(3L);
        empresa.setSlug("tienda-ficticia");
        empresa.setNombreEmpresa("Tienda Ficticia");
        when(empresas.findById(3L)).thenReturn(Optional.of(empresa));
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(u.getId(), 3L, 1)).thenReturn(Optional.of(new MiembroEmpresa()));
        AuthTenantSwitchHandler h = new AuthTenantSwitchHandler();
        ReflectionTestUtils.setField(h, "usuarioService", usuarioService);
        ReflectionTestUtils.setField(h, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(h, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(h, "miembroEmpresaRepository", miembros);
        ReflectionTestUtils.setField(h, "empresaRepository", empresas);
        ReflectionTestUtils.setField(h, "authSupport", authSupport);
        return h;
    }

    @ParameterizedTest(name = "seleccionar-empresa con la cuenta en estado {0} → 401 genérico y sin tokens")
    @ValueSource(ints = {2, 3, 4, 5, 0, 9})
    @DisplayName("seleccionar-empresa: cuenta no activa → 401 genérico, sin access ni refresh y sin consultar membresías")
    void seleccionarEmpresaCuentaNoActiva(int estado) {
        MiembroEmpresaRepository miembros = mock(MiembroEmpresaRepository.class);
        ResponseEntity<?> r = tenant(usuario(estado), miembros).seleccionarEmpresa(
            Map.of("tempToken", "temp", "empresaId", 3), mock(HttpServletResponse.class));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        assertThat(((ResponseDTO) r.getBody()).getMessage()).isEqualTo(TOKEN_EXPIRADO);
        verify(jwtUtil, never()).generateToken(anyString(), anyLong(), anyString(), any(), any());
        verify(refreshTokenService, never()).crear(any(Usuario.class), anyLong());
        verify(miembros, never()).findByUsuarioIdAndEmpresaIdAndEstado(anyLong(), anyLong(), anyInt());
    }

    @ParameterizedTest
    @NullSource
    @DisplayName("seleccionar-empresa: cuenta sin estado → falla cerrado, sin tokens")
    void seleccionarEmpresaSinEstado(Integer estado) {
        MiembroEmpresaRepository miembros = mock(MiembroEmpresaRepository.class);
        ResponseEntity<?> r = tenant(usuario(estado), miembros).seleccionarEmpresa(
            Map.of("tempToken", "temp", "empresaId", 3), mock(HttpServletResponse.class));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        verify(jwtUtil, never()).generateToken(anyString(), anyLong(), anyString(), any(), any());
        verify(refreshTokenService, never()).crear(any(Usuario.class), anyLong());
    }

    @Test
    @DisplayName("control: seleccionar-empresa con la cuenta activa → 200 con token del negocio")
    void seleccionarEmpresaCuentaActiva() {
        ResponseEntity<?> r = tenant(usuario(1), mock(MiembroEmpresaRepository.class)).seleccionarEmpresa(
            Map.of("tempToken", "temp", "empresaId", 3), mock(HttpServletResponse.class));
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(((AuthResponse) r.getBody()).getAccessToken()).isEqualTo("jwt-negocio-fict");
    }

    // ── 2. OTP por correo ───────────────────────────────────────────────────────────

    private AuthEmailOtpHandler otp(Usuario u, OtpService otpService) {
        UsuarioService usuarioService = mock(UsuarioService.class);
        when(jwtUtil.isTempToken("temp")).thenReturn(true);
        when(jwtUtil.extractUserId("temp")).thenReturn(u.getId());
        when(usuarioService.buscarPorId(u.getId())).thenReturn(Optional.of(u));
        u.setTwoFactorEnabled(true);
        u.addMethod(com.hotclick.utils.Constants.METODO_2FA_EMAIL_OTP);
        AuthEmailOtpHandler h = new AuthEmailOtpHandler();
        ReflectionTestUtils.setField(h, "usuarioService", usuarioService);
        ReflectionTestUtils.setField(h, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(h, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(h, "otpService", otpService);
        ReflectionTestUtils.setField(h, "authSupport", authSupport);
        return h;
    }

    @ParameterizedTest(name = "OTP por correo a una cuenta en estado {0} → 401 genérico y sin enviar")
    @ValueSource(ints = {2, 3, 4, 5, 0, 9})
    @DisplayName("OTP por correo: cuenta no activa → no se envía el código y la respuesta es genérica")
    void otpCuentaNoActivaNoEnvia(int estado) {
        OtpService otpService = mock(OtpService.class);
        ResponseEntity<ResponseDTO> r = otp(usuario(estado), otpService).sendLoginEmailOtp(Map.of("tempToken", "temp"), new MockHttpServletRequest());
        verify(otpService, never()).enviarOtp2Fa(any(Usuario.class));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
        assertThat(r.getBody().getMessage()).isEqualTo(GENERICO).doesNotContain("ejemplo.test");
    }

    @ParameterizedTest
    @NullSource
    @DisplayName("OTP por correo: cuenta sin estado → falla cerrado, no se envía")
    void otpSinEstadoNoEnvia(Integer estado) {
        OtpService otpService = mock(OtpService.class);
        ResponseEntity<ResponseDTO> r = otp(usuario(estado), otpService).sendLoginEmailOtp(Map.of("tempToken", "temp"), new MockHttpServletRequest());
        verify(otpService, never()).enviarOtp2Fa(any(Usuario.class));
        assertThat(r.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("control: OTP por correo a una cuenta activa → 200 y se envía")
    void otpCuentaActivaEnvia() {
        OtpService otpService = mock(OtpService.class);
        ResponseEntity<ResponseDTO> r = otp(usuario(1), otpService).sendLoginEmailOtp(Map.of("tempToken", "temp"), new MockHttpServletRequest());
        verify(otpService).enviarOtp2Fa(any(Usuario.class));
        assertThat(r.getStatusCode().value()).isEqualTo(200);
    }

    // ── 3 y 4. Clerk ────────────────────────────────────────────────────────────────

    private ClerkSyncService clerk(UsuarioRepository repo) {
        ClerkSyncService s = new ClerkSyncService();
        ReflectionTestUtils.setField(s, "usuarioRepository", repo);
        ReflectionTestUtils.setField(s, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(s, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(s, "authSupport", authSupport);
        return s;
    }

    @ParameterizedTest(name = "Clerk con la cuenta del correo en estado {0}: no se vincula, no se guarda la foto y el rechazo es genérico")
    @ValueSource(ints = {2, 3, 4, 5})
    @DisplayName("Clerk por correo: cuenta no activa → rechazo genérico antes de vincular clerkUserId o foto; nada se persiste")
    void clerkPorCorreoNoActivaNoPersisteNada(int estado) {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(estado);
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.empty());
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        assertThatThrownBy(() -> clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "https://img.ejemplo.test/f.png", true))
            .isInstanceOf(SecurityException.class)
            .hasMessage(GENERICO);
        verify(repo, never()).save(any(Usuario.class));
        verify(repo, never()).updateUltimoAcceso(anyLong(), any());
        assertThat(u.getClerkUserId()).isNull();
        assertThat(u.getFotoPerfilUrl()).isNull();
    }

    @ParameterizedTest(name = "Clerk con la cuenta ya vinculada en estado {0} → mensaje genérico")
    @ValueSource(ints = {2, 3, 4, 5})
    @DisplayName("Clerk por clerkUserId: cuenta no activa (incluida la eliminada) → siempre el mensaje genérico")
    void clerkVinculadaNoActivaMensajeGenerico(int estado) {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(estado);
        u.setClerkUserId("user_fict");
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "", true))
            .isInstanceOf(SecurityException.class)
            .hasMessage(GENERICO);
        verify(repo, never()).save(any(Usuario.class));
        verify(repo, never()).updateUltimoAcceso(anyLong(), any());
    }

    @Test
    @DisplayName("Clerk: la cuenta eliminada ya no responde \"Esta cuenta fue cerrada.\"")
    void clerkEliminadaYaNoDelataElCierre() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(3);
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.empty());
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "", true))
            .isInstanceOf(SecurityException.class)
            .satisfies(e -> assertThat(e.getMessage()).doesNotContain("cerrada").isEqualTo(GENERICO));
    }

    @Test
    @DisplayName("control: Clerk por correo con cuenta activa → se vincula, se guarda la foto y recibe tokens")
    void clerkPorCorreoActivaSeVincula() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario u = usuario(1);
        when(repo.findByClerkUserId("user_fict")).thenReturn(Optional.empty());
        when(repo.findByCorreo(u.getCorreo())).thenReturn(Optional.of(u));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        AuthResponse r = clerk(repo).sync("user_fict", u.getCorreo(), "Persona", "Ficticia", "https://img.ejemplo.test/f.png", true);
        assertThat(r.getAccessToken()).isEqualTo("jwt-fict");
        assertThat(u.getClerkUserId()).isEqualTo("user_fict");
        assertThat(u.getFotoPerfilUrl()).isEqualTo("https://img.ejemplo.test/f.png");
        verify(repo).save(u);
    }
}
