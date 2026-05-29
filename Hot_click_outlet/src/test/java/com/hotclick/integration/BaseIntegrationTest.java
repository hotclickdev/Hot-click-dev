package com.hotclick.integration;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.payment.PayPalPaymentProvider;
import com.hotclick.payment.PayXpertPaymentProvider;
import com.hotclick.repository.RefreshTokenRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.BccrService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

/**
 * Base para todos los integration tests.
 *
 * Crea dos usuarios estándar antes de cada test:
 *   - testUser  (USUARIO_FINAL) → userToken
 *   - adminUser (ADMIN_IT)      → adminToken
 *
 * Mockea todos los servicios con I/O externos para que el contexto
 * Spring arranque sin conexiones reales (email, storage, pagos).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    // ── Mocks de servicios externos ───────────────────────────────────────────
    @MockitoBean protected ResendEmailService       resendEmailService;
    @MockitoBean protected NotificacionEmailService notificacionEmailService;
    @MockitoBean protected SupabaseStorageService   supabaseStorageService;
    @MockitoBean protected PayXpertPaymentProvider  payXpertProvider;
    @MockitoBean protected PayPalPaymentProvider    payPalProvider;
    @MockitoBean protected BccrService              bccrService;
    @MockitoBean protected GeminiService            geminiService;

    // ── Beans del contexto ────────────────────────────────────────────────────
    @Autowired protected MockMvc        mockMvc;
    @Autowired protected JwtUtil        jwtUtil;
    @Autowired protected PasswordEncoder passwordEncoder;

    @Autowired protected UsuarioRepository      usuarioRepository;
    @Autowired protected RolRepository          rolRepository;
    @Autowired protected RefreshTokenRepository refreshTokenRepository;

    // ── Datos de test expuestos a subclases ───────────────────────────────────
    protected Usuario testUser;
    protected Usuario adminUser;
    protected String  userToken;
    protected String  adminToken;

    @BeforeEach
    void baseSetUp() {
        // Limpiar estado previo (falla segura si ya no hay datos)
        refreshTokenRepository.deleteAll();
        usuarioRepository.deleteAll();

        Rol rolUser  = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Rol rolAdmin = obtenerOCrearRol(Constants.ROL_ADMIN_IT, 10);

        testUser  = crearUsuario("testuser@hotclick.cr",  "Test User",  rolUser);
        adminUser = crearUsuario("adminit@hotclick.cr",   "Admin IT",   rolAdmin);

        userToken  = "Bearer " + jwtUtil.generateToken(
            testUser.getCorreo(),  testUser.getId(),  Constants.ROL_USUARIO_FINAL);
        adminToken = "Bearer " + jwtUtil.generateToken(
            adminUser.getCorreo(), adminUser.getId(), Constants.ROL_ADMIN_IT);
    }

    @AfterEach
    void baseTearDown() {
        refreshTokenRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    // ── Helpers para subclases ────────────────────────────────────────────────

    protected Rol obtenerOCrearRol(String nombre, int nivel) {
        return rolRepository.findByNombreRol(nombre).orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombreRol(nombre);
            rol.setNivelAcceso(nivel);
            rol.setEstado(Constants.ESTADO_ACTIVO);
            return rolRepository.saveAndFlush(rol);
        });
    }

    protected Usuario crearUsuario(String correo, String nombre, Rol rol) {
        Usuario u = new Usuario();
        u.setCorreo(correo);
        u.setNombre(nombre);
        u.setApellidoPaterno("Test");
        u.setIdentificacion(correo.replaceAll("[^a-zA-Z0-9]", "").substring(0, Math.min(20, correo.replaceAll("[^a-zA-Z0-9]", "").length())));
        u.setTelefono("88888888");
        u.setContrasenaHash(passwordEncoder.encode("Test1234!"));
        u.setEstado(Constants.ESTADO_ACTIVO);
        u.setIntentosFallidos(0);
        u.setRoles(new ArrayList<>(List.of(rol)));
        return usuarioRepository.saveAndFlush(u);
    }

    protected String tokenPara(Usuario usuario, String rol) {
        return "Bearer " + jwtUtil.generateToken(usuario.getCorreo(), usuario.getId(), rol);
    }
}
