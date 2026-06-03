package com.hotclick.service;

import com.hotclick.service.PasswordResetService;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F35-02 — UsuarioService.incrementarIntentosFallidos(): atómico, sin race condition.
 *
 * Verifica:
 * - Con exactamente 5 intentos → envía email de recuperación (una sola vez)
 * - Con 6+ intentos → NO envía email (exactamente == 5, no >= 5)
 * - Con < 5 intentos → NO envía email
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F35-02 — UsuarioService: lockout atómico sin race condition email")
class UsuarioServiceLockoutTest {

    @Mock UsuarioRepository    usuarioRepository;
    @Mock RolRepository        rolRepository;
    @Mock PasswordResetService passwordResetService;

    @InjectMocks UsuarioService service;

    // ── Exactamente 5 → email enviado ─────────────────────────────────────

    @Test
    @DisplayName("RETURNING = 5 → envía email de recuperación (exactamente una vez)")
    void incrementar_at5Intentos_sendsEmail() {
        // Simula RETURNING devuelve intentos_fallidos = 5
        List<Object[]> result = new java.util.ArrayList<>();
        result.add(new Object[]{5});
        when(usuarioRepository.incrementarYBloquear(1L)).thenReturn(result);

        com.hotclick.model.Usuario usuario = new com.hotclick.model.Usuario();
        usuario.setId(1L);
        usuario.setCorreo("victim@test.cr");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));

        service.incrementarIntentosFallidos(1L);

        verify(passwordResetService, times(1)).enviarCodigo("victim@test.cr");
    }

    // ── 6 intentos (ya bloqueado) → NO email ──────────────────────────────

    @Test
    @DisplayName("RETURNING = 6 → NO envía email (solo al exacto 5, no >=5)")
    void incrementar_at6Intentos_noEmail() {
        List<Object[]> result = new java.util.ArrayList<>();
        result.add(new Object[]{6});
        when(usuarioRepository.incrementarYBloquear(1L)).thenReturn(result);

        service.incrementarIntentosFallidos(1L);

        verify(passwordResetService, never()).enviarCodigo(anyString());
        verify(usuarioRepository, never()).findById(anyLong());
    }

    // ── 4 intentos → NO email, NO bloqueo ─────────────────────────────────

    @Test
    @DisplayName("RETURNING = 4 → NO envía email, advertencia silenciosa")
    void incrementar_at4Intentos_noEmail() {
        List<Object[]> result = new java.util.ArrayList<>();
        result.add(new Object[]{4});
        when(usuarioRepository.incrementarYBloquear(1L)).thenReturn(result);

        service.incrementarIntentosFallidos(1L);

        verify(passwordResetService, never()).enviarCodigo(anyString());
    }

    // ── RETURNING vacío (usuario no existe) → sin error ───────────────────

    @Test
    @DisplayName("RETURNING vacío (usuario no encontrado) → retorna silenciosamente")
    void incrementar_emptyResult_noCrash() {
        when(usuarioRepository.incrementarYBloquear(99L))
            .thenReturn(java.util.Collections.emptyList());

        // No debe lanzar excepción
        service.incrementarIntentosFallidos(99L);

        verify(passwordResetService, never()).enviarCodigo(anyString());
    }

    // ── Email falla → no interrumpe el flujo de login ─────────────────────

    @Test
    @DisplayName("Email de recuperación falla → excepción capturada, flujo continúa")
    void incrementar_emailFails_noExceptionPropagated() {
        List<Object[]> result = new java.util.ArrayList<>();
        result.add(new Object[]{5});
        when(usuarioRepository.incrementarYBloquear(1L)).thenReturn(result);

        com.hotclick.model.Usuario usuario = new com.hotclick.model.Usuario();
        usuario.setCorreo("victim@test.cr");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        doThrow(new RuntimeException("SendGrid down"))
            .when(passwordResetService).enviarCodigo(anyString());

        // No debe propagarse la excepción del email
        assertThatNoException().isThrownBy(() -> service.incrementarIntentosFallidos(1L));
    }

    // ── CRÍTICO: exactamente 5 (no >= 5) elimina race condition ───────────

    @Test
    @DisplayName("Thread A devuelve 5, Thread B devuelve 6 → solo A envía email (anti-TOCTOU)")
    void incrementar_concurrentThreads_onlyExact5SendsEmail() {
        // Thread A ve intentos = 5
        List<Object[]> resultA = new java.util.ArrayList<>();
        resultA.add(new Object[]{5});

        // Thread B ve intentos = 6 (ya fue incrementado por A)
        List<Object[]> resultB = new java.util.ArrayList<>();
        resultB.add(new Object[]{6});

        when(usuarioRepository.incrementarYBloquear(1L))
            .thenReturn(resultA)   // primera llamada (Thread A)
            .thenReturn(resultB);  // segunda llamada (Thread B)

        com.hotclick.model.Usuario usuario = new com.hotclick.model.Usuario();
        usuario.setCorreo("victim@test.cr");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));

        // Simular dos llamadas concurrentes
        service.incrementarIntentosFallidos(1L); // Thread A → email
        service.incrementarIntentosFallidos(1L); // Thread B → sin email

        // Solo 1 email enviado (Thread A), no 2
        verify(passwordResetService, times(1)).enviarCodigo("victim@test.cr");
    }
}
