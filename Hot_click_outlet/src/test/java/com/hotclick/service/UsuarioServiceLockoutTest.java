package com.hotclick.service;

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
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F35-02 — UsuarioService.incrementarIntentosFallidos(): atómico, sin race condition.
 *
 * Verifica:
 * - Con exactamente 5 intentos → publica CuentaBloqueadaEvent (una sola vez)
 * - Con 6+ intentos → NO publica evento (exactamente == 5, no >= 5)
 * - Con < 5 intentos → NO publica evento
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F35-02 — UsuarioService: lockout atómico sin race condition email")
class UsuarioServiceLockoutTest {

    @Mock UsuarioRepository         usuarioRepository;
    @Mock RolRepository             rolRepository;
    @Mock PasswordResetService      passwordResetService;
    @Mock ApplicationEventPublisher eventPublisher;

    @InjectMocks UsuarioService service;

    // ── Exactamente 5 → evento publicado ──────────────────────────────────

    @Test
    @DisplayName("intentosFallidos = 5 → publica CuentaBloqueadaEvent (exactamente una vez)")
    void incrementar_at5Intentos_publicaEvento() {
        when(usuarioRepository.findIntentosFallidos(1L)).thenReturn(Optional.of(5));

        com.hotclick.model.Usuario usuario = new com.hotclick.model.Usuario();
        usuario.setId(1L);
        usuario.setCorreo("victim@test.cr");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));

        service.incrementarIntentosFallidos(1L);

        verify(usuarioRepository).incrementarYBloquear(1L);
        verify(eventPublisher, times(1)).publishEvent(
            argThat(e -> e instanceof CuentaBloqueadaEvent
                && "victim@test.cr".equals(((CuentaBloqueadaEvent) e).getCorreo())));
    }

    // ── 6 intentos (ya bloqueado) → sin evento ────────────────────────────

    @Test
    @DisplayName("intentosFallidos = 6 → NO publica evento (solo al exacto 5, no >=5)")
    void incrementar_at6Intentos_sinEvento() {
        when(usuarioRepository.findIntentosFallidos(1L)).thenReturn(Optional.of(6));

        service.incrementarIntentosFallidos(1L);

        verify(eventPublisher, never()).publishEvent(any());
        verify(usuarioRepository, never()).findById(anyLong());
    }

    // ── 4 intentos → sin evento, sin bloqueo ──────────────────────────────

    @Test
    @DisplayName("intentosFallidos = 4 → NO publica evento, advertencia silenciosa")
    void incrementar_at4Intentos_sinEvento() {
        when(usuarioRepository.findIntentosFallidos(1L)).thenReturn(Optional.of(4));

        service.incrementarIntentosFallidos(1L);

        verify(eventPublisher, never()).publishEvent(any());
    }

    // ── Usuario no existe → sin error ──────────────────────────────────────

    @Test
    @DisplayName("findIntentosFallidos vacío (usuario no encontrado) → retorna silenciosamente")
    void incrementar_sinResultado_noCrash() {
        when(usuarioRepository.findIntentosFallidos(99L)).thenReturn(Optional.empty());

        // No debe lanzar excepción
        service.incrementarIntentosFallidos(99L);

        verify(eventPublisher, never()).publishEvent(any());
    }

    // ── CRÍTICO: exactamente 5 (no >= 5) elimina race condition ───────────

    @Test
    @DisplayName("Thread A lee 5, Thread B lee 6 → solo A publica el evento (anti-TOCTOU)")
    void incrementar_concurrentThreads_soloExact5PublicaEvento() {
        when(usuarioRepository.findIntentosFallidos(1L))
            .thenReturn(Optional.of(5))   // primera llamada (Thread A)
            .thenReturn(Optional.of(6));  // segunda llamada (Thread B)

        com.hotclick.model.Usuario usuario = new com.hotclick.model.Usuario();
        usuario.setCorreo("victim@test.cr");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));

        // Simular dos llamadas concurrentes
        service.incrementarIntentosFallidos(1L); // Thread A → evento
        service.incrementarIntentosFallidos(1L); // Thread B → sin evento

        // Solo 1 evento publicado (Thread A), no 2
        verify(eventPublisher, times(1)).publishEvent(any(CuentaBloqueadaEvent.class));
    }
}
