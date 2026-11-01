package com.hotclick.legal;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SesionesUsuarioService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Cerrar la cuenta (ARCO) tiene que sacar al usuario de la caché de UserDetails del filtro JWT. La caché está
 * indexada por el correo con el que se emitió el token, y el cierre renombra el correo antes de cortar las
 * sesiones: se invalida con el correo previo. Datos ficticios.
 */
@DisplayName("CuentaTitularService.cerrar invalida la caché de UserDetails con el correo previo")
class CuentaTitularCierreCacheTest {

    private static final String CORREO = "titular.ficticio@ejemplo.test";

    private UsuarioRepository usuarioRepository;
    private PedidoRepository pedidoRepository;
    private RefreshTokenService refreshTokenService;
    private Cache<String, UserDetails> cache;
    private CuentaTitularService servicio;

    @BeforeEach
    void preparar() throws Exception {
        usuarioRepository = mock(UsuarioRepository.class);
        pedidoRepository = mock(PedidoRepository.class);
        refreshTokenService = mock(RefreshTokenService.class);
        cache = Caffeine.newBuilder().build();
        SesionesUsuarioService sesiones = new SesionesUsuarioService();
        ReflectionTestUtils.setField(sesiones, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(sesiones, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(sesiones, "userDetailsCache", cache);
        // El constructor de antes no pedía SesionesUsuarioService: se arma con lo que pida.
        Object[] candidatos = {usuarioRepository, pedidoRepository, refreshTokenService, sesiones};
        Constructor<?> c = CuentaTitularService.class.getConstructors()[0];
        Object[] args = Arrays.stream(c.getParameterTypes())
            .map(t -> Arrays.stream(candidatos).filter(t::isInstance).findFirst().orElse(null))
            .toArray();
        servicio = (CuentaTitularService) c.newInstance(args);
    }

    private static Usuario titular(Integer estado) {
        Usuario u = new Usuario();
        u.setId(41L);
        u.setCorreo(CORREO);
        u.setNombre("Titular");
        u.setEstado(estado);
        return u;
    }

    @Test
    @DisplayName("cerrar saca el UserDetails cacheado bajo el correo previo y corta las sesiones")
    void cerrarInvalidaLaCacheConElCorreoPrevio() {
        cache.put(CORREO, new User(CORREO, "x", List.of()));
        Usuario u = titular(Constants.ESTADO_ACTIVO);

        servicio.cerrar(u);

        assertThat(cache.getIfPresent(CORREO)).as("UserDetails del correo previo sigue en caché").isNull();
        assertThat(u.getCorreo()).isEqualTo("cerrada.41@invalid.hotclick.lat");
        assertThat(u.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertThat(u.getSesionesInvalidadasEn()).isNotNull();
        verify(refreshTokenService).revocarTodosDeUsuario(u);
        verify(usuarioRepository, org.mockito.Mockito.atLeastOnce()).save(u);
    }

    @Test
    @DisplayName("cerrar una cuenta ya cerrada no hace nada")
    void cerrarDosVecesEsNoop() {
        Usuario u = titular(Constants.ESTADO_ELIMINADO);
        cache.put(CORREO, new User(CORREO, "x", List.of()));

        servicio.cerrar(u);

        assertThat(u.getCorreo()).isEqualTo(CORREO);
        verify(refreshTokenService, never()).revocarTodosDeUsuario(u);
    }
}
