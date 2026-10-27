package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.RateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * UsuarioService.registrarFalloAutenticacion(): tope por usuario+IP y bloqueo global TEMPORAL.
 * El evento de aviso al dueño se publica solo al llegar exactamente al umbral global (no en cada fallo posterior).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("UsuarioService: bloqueo por fallos (usuario+IP, global temporal)")
class UsuarioServiceLockoutTest {

    @Mock UsuarioRepository         usuarioRepository;
    @Mock RolRepository             rolRepository;
    @Mock PasswordResetService      passwordResetService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock RateLimiter               rateLimiter;

    @InjectMocks UsuarioService service;

    private Usuario victima() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setCorreo("victim@test.cr");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        return usuario;
    }

    @Test
    @DisplayName("fallo bajo el umbral global: cuenta por IP y global, no bloquea ni avisa")
    void bajoElUmbral_noBloquea() {
        when(rateLimiter.registrar(eq("auth:fallos:usuario:1:global"), anyInt())).thenReturn(19);

        service.registrarFalloAutenticacion(1L, "203.0.113.5");

        verify(rateLimiter).registrar(eq("auth:fallos:usuario:1:ip:203.0.113.5"), eq(1800));
        verify(usuarioRepository).incrementarIntentosFallidos(1L);
        verify(usuarioRepository, never()).bloquearUsuario(anyLong(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("5 fallos desde UNA IP no bloquean la cuenta (la IP queda afuera, el dueño no)")
    void cincoFallosDeUnaIp_noBloqueanLaCuenta() {
        when(rateLimiter.registrar(eq("auth:fallos:usuario:1:global"), anyInt())).thenReturn(5);

        service.registrarFalloAutenticacion(1L, "203.0.113.5");

        verify(usuarioRepository, never()).bloquearUsuario(anyLong(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("global = 20 → bloqueo TEMPORAL (~30 min) y un solo aviso al dueño")
    void alUmbralGlobal_bloqueaTemporalYAvisa() {
        victima();
        when(rateLimiter.registrar(eq("auth:fallos:usuario:1:global"), anyInt())).thenReturn(20);

        service.registrarFalloAutenticacion(1L, "203.0.113.5");

        verify(usuarioRepository).bloquearUsuario(eq(1L),
            argThat(h -> h.isAfter(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).plusMinutes(25)) && h.isBefore(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).plusMinutes(35))));
        verify(eventPublisher, times(1)).publishEvent(
            argThat(e -> e instanceof CuentaBloqueadaEvent && "victim@test.cr".equals(((CuentaBloqueadaEvent) e).getCorreo())));
    }

    @Test
    @DisplayName("global = 21 → mantiene el bloqueo pero NO repite el aviso")
    void porEncimaDelUmbral_sinSegundoAviso() {
        victima();
        when(rateLimiter.registrar(eq("auth:fallos:usuario:1:global"), anyInt())).thenReturn(21);

        service.registrarFalloAutenticacion(1L, "203.0.113.5");

        verify(usuarioRepository).bloquearUsuario(eq(1L), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("limitador caído (registrar devuelve 0): no bloquea a nadie (fail-open)")
    void limitadorCaido_noBloquea() {
        when(rateLimiter.registrar(anyString(), anyInt())).thenReturn(0);

        service.registrarFalloAutenticacion(1L, "203.0.113.5");

        verify(usuarioRepository, never()).bloquearUsuario(anyLong(), any());
    }

    @Test
    @DisplayName("ipBloqueadaParaUsuario consulta la llave usuario+IP con 5 en 1800 s")
    void ipBloqueada_consultaLaLlavePorIp() {
        when(rateLimiter.alcanzoLimite("auth:fallos:usuario:1:ip:203.0.113.5", 5, 1800)).thenReturn(true);

        org.assertj.core.api.Assertions.assertThat(service.ipBloqueadaParaUsuario(1L, "203.0.113.5")).isTrue();
        org.assertj.core.api.Assertions.assertThat(service.ipBloqueadaParaUsuario(1L, "198.51.100.7")).isFalse();
    }

    @Test
    @DisplayName("autenticación completa: pone el contador en 0 y borra el bucket global y el de esa IP")
    void resetearLiberaLosBuckets() {
        service.resetearIntentosFallidos(1L, "198.51.100.7");

        verify(usuarioRepository).resetearIntentosFallidos(1L);
        verify(rateLimiter).liberar("auth:fallos:usuario:1:global");
        verify(rateLimiter).liberar("auth:fallos:usuario:1:ip:198.51.100.7");
    }

    private Usuario nuevoQueRecibeId(long id) {
        Usuario nuevo = new Usuario();
        nuevo.setCorreo("nuevo@test.cr");
        nuevo.setIdentificacion("111222333");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(id);
            return u;
        });
        return nuevo;
    }

    @Test
    @DisplayName("registrarSolicitud: la cuenta nueva arranca sin contadores (global + todos los de IP de ese id)")
    void registrarSolicitud_liberaContadores() {
        service.registrarSolicitud(nuevoQueRecibeId(77L));

        verify(rateLimiter).liberar("auth:fallos:usuario:77:global");
        verify(rateLimiter).liberarPrefijo("auth:fallos:usuario:77:ip:");
    }

    @Test
    @DisplayName("registrarPendiente: la cuenta nueva arranca sin contadores (global + todos los de IP de ese id)")
    void registrarPendiente_liberaContadores() {
        service.registrarPendiente(nuevoQueRecibeId(78L));

        verify(rateLimiter).liberar("auth:fallos:usuario:78:global");
        verify(rateLimiter).liberarPrefijo("auth:fallos:usuario:78:ip:");
    }
}
