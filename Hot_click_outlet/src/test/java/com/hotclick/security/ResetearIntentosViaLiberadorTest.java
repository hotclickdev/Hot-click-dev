package com.hotclick.security;

import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.model.Usuario;
import com.hotclick.service.OtpService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

/**
 * Seguimiento de #417 (L2): {@code UsuarioService.resetearIntentosFallidos} limpia los buckets por {@link LiberadorFallos}
 * (tras el commit, en transacción aparte, sin poder abortar la transacción del login), y el desbloqueo por reset de
 * contraseña conserva los contadores si {@code cambiarContrasena} se revierte.
 */
@DisplayName("[Auth] resetearIntentosFallidos pasa por LiberadorFallos (sin tx, con rollback y con SQL fallido)")
class ResetearIntentosViaLiberadorTest extends BaseIntegrationTest {

    private static final String IP_A = "203.0.113.5";
    private static final String IP_B = "198.51.100.7";

    @Autowired private UsuarioService usuarioService;
    @Autowired private PasswordResetService passwordResetService;
    @Autowired private LiberadorFallos liberador;
    @Autowired private PlatformTransactionManager txManager;
    @MockitoSpyBean private RateLimiter rateLimiter;
    @MockitoSpyBean private RefreshTokenService refreshTokenService;
    @MockitoBean private OtpService otpService;

    private boolean existe(String key) {
        Integer n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_rate_limit_tb WHERE bucket_key = ?", Integer.class, key);
        return n != null && n > 0;
    }

    private void sembrarContadores(Long id) {
        rateLimiter.registrar(ClavesFallos.claveGlobal(id), 600);
        rateLimiter.registrar(ClavesFallos.claveIp(id, IP_A), 600);
        rateLimiter.registrar(ClavesFallos.claveIp(id, IP_B), 600);
    }

    private void ponerIntentos(Long id, int n) {
        Usuario u = usuarioRepository.findById(id).orElseThrow();
        u.setIntentosFallidos(n);
        usuarioRepository.save(u);
    }

    // ── sin transacción ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Sin transacción activa: limpia de inmediato solo el global y esa IP (no las otras)")
    void sinTransaccionLimpiaDeInmediato() {
        Long id = testUser.getId();
        sembrarContadores(id);

        liberador.liberarGlobalEIp(id, IP_A);

        assertThat(existe(ClavesFallos.claveGlobal(id))).isFalse();
        assertThat(existe(ClavesFallos.claveIp(id, IP_A))).isFalse();
        assertThat(existe(ClavesFallos.claveIp(id, IP_B))).as("otra IP sigue contando").isTrue();
    }

    @Test
    @DisplayName("Sin transacción activa: un SQL fallido del limitador no se propaga y deja los contadores")
    void sinTransaccionNoPropagaElError() {
        Long id = testUser.getId();
        sembrarContadores(id);
        doThrow(new DataAccessResourceFailureException("caida")).when(rateLimiter).liberar(anyString());

        liberador.liberarGlobalEIp(id, IP_A);
        liberador.liberarGlobal(id);
        liberador.liberar(id);

        assertThat(existe(ClavesFallos.claveGlobal(id))).isTrue();
    }

    @Test
    @DisplayName("Con id nulo no hace nada")
    void idNuloNoHaceNada() {
        liberador.liberarGlobalEIp(null, IP_A);
        liberador.liberarGlobal(null);
        liberador.liberar(null);
    }

    // ── resetearIntentosFallidos (login completo) ───────────────────────────────────

    @Test
    @DisplayName("Login completo: el contador a 0 y los buckets (global + esa IP) se limpian tras el commit")
    void resetearLimpiaTrasElCommit() {
        Long id = testUser.getId();
        sembrarContadores(id);
        ponerIntentos(id, 3);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            usuarioService.resetearIntentosFallidos(id, IP_A);
            assertThat(existe(ClavesFallos.claveGlobal(id))).as("aún no: la tx no se ha confirmado").isTrue();
        });

        assertThat(usuarioRepository.findById(id).orElseThrow().getIntentosFallidos()).isZero();
        assertThat(existe(ClavesFallos.claveGlobal(id))).isFalse();
        assertThat(existe(ClavesFallos.claveIp(id, IP_A))).isFalse();
        assertThat(existe(ClavesFallos.claveIp(id, IP_B))).isTrue();
    }

    @Test
    @DisplayName("Login completo revertido: los contadores (BD y limitador) se conservan")
    void resetearRevertidoConservaContadores() {
        Long id = testUser.getId();
        sembrarContadores(id);
        ponerIntentos(id, 3);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            usuarioService.resetearIntentosFallidos(id, IP_A);
            s.setRollbackOnly();
        });

        assertThat(usuarioRepository.findById(id).orElseThrow().getIntentosFallidos()).isEqualTo(3);
        assertThat(existe(ClavesFallos.claveGlobal(id))).isTrue();
        assertThat(existe(ClavesFallos.claveIp(id, IP_A))).isTrue();
    }

    @Test
    @DisplayName("Si el limitador falla al limpiar, el login completo igual confirma el contador en 0")
    void falloDelLimitadorNoRevierteElReseteo() {
        Long id = testUser.getId();
        sembrarContadores(id);
        ponerIntentos(id, 3);
        doThrow(new DataAccessResourceFailureException("caida")).when(rateLimiter).liberar(anyString());

        new TransactionTemplate(txManager).executeWithoutResult(s -> usuarioService.resetearIntentosFallidos(id, IP_A));

        assertThat(usuarioRepository.findById(id).orElseThrow().getIntentosFallidos()).isZero();
    }

    @Test
    @DisplayName("resetearIntentosFallidos(id) sin IP: limpia solo el global, tras el commit")
    void resetearSinIpLimpiaElGlobal() {
        Long id = testUser.getId();
        sembrarContadores(id);

        new TransactionTemplate(txManager).executeWithoutResult(s -> usuarioService.resetearIntentosFallidos(id));

        assertThat(existe(ClavesFallos.claveGlobal(id))).isFalse();
        assertThat(existe(ClavesFallos.claveIp(id, IP_A))).isTrue();
    }

    // ── rollback de cambiarContrasena ───────────────────────────────────────────────

    @Test
    @DisplayName("Si cambiarContrasena se revierte, la contraseña no cambia y los contadores se conservan")
    void rollbackDeCambiarContrasenaConservaContadores() {
        Long id = testUser.getId();
        when(otpService.canjearOtpVerificado(any(), eq(Constants.OTP_TIPO_RESET_PASSWORD), anyString())).thenReturn(true);
        doThrow(new IllegalStateException("falla al revocar sesiones")).when(refreshTokenService).revocarTodosDeUsuario(any());
        sembrarContadores(id);
        String hashAntes = usuarioRepository.findById(id).orElseThrow().getContrasenaHash();

        assertThatThrownBy(() -> passwordResetService.cambiarContrasena(testUser.getCorreo(), "123456", "NuevaClave123!"))
            .isInstanceOf(IllegalStateException.class);

        assertThat(usuarioRepository.findById(id).orElseThrow().getContrasenaHash()).isEqualTo(hashAntes);
        assertThat(existe(ClavesFallos.claveGlobal(id))).as("rollback: el global sigue").isTrue();
        assertThat(existe(ClavesFallos.claveIp(id, IP_A))).isTrue();
    }
}
