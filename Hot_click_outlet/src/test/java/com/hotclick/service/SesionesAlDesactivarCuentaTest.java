package com.hotclick.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Eliminar, rechazar, bloquear, desactivar o quitar del último equipo a un usuario debe cortar sus sesiones: revocar
 * todos sus refresh tokens, marcar sesionesInvalidadasEn (mata los access tokens ya emitidos) y sacarlo de la caché
 * de UserDetails del filtro JWT. Antes solo cambiaban el estado y el usuario seguía operando con su token.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Cuenta que deja de estar activa → se cortan sus sesiones")
class SesionesAlDesactivarCuentaTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @Mock RefreshTokenService refreshTokenService;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    private final Cache<String, UserDetails> userDetailsCache = Caffeine.newBuilder().build();
    @Spy SesionesUsuarioService sesiones = new SesionesUsuarioService();
    @InjectMocks AdminUsuarioService adminService;
    @InjectMocks EquipoService equipoService;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sesiones, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(sesiones, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(sesiones, "userDetailsCache", userDetailsCache);
        usuario = new Usuario();
        usuario.setId(31L);
        usuario.setCorreo("cortar@test.cr");
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        when(usuarioRepository.findById(31L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        userDetailsCache.put("cortar@test.cr", new User("cortar@test.cr", "x", List.of()));
    }

    private void assertSesionesCortadas() {
        verify(refreshTokenService).revocarTodosDeUsuario(usuario);
        assertThat(usuario.getSesionesInvalidadasEn()).isNotNull();
        assertThat(userDetailsCache.getIfPresent("cortar@test.cr")).isNull();
    }

    @Test
    @DisplayName("admin.eliminar → estado 3 y sesiones cortadas")
    void adminEliminar() {
        adminService.eliminar(31L);
        assertThat(usuario.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertSesionesCortadas();
    }

    @Test
    @DisplayName("admin.rechazar → estado 3 y sesiones cortadas")
    void adminRechazar() {
        adminService.rechazar(31L);
        assertThat(usuario.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertSesionesCortadas();
    }

    @Test
    @DisplayName("admin.bloquear → estado 4 y sesiones cortadas")
    void adminBloquear() {
        adminService.bloquear(31L);
        assertThat(usuario.getEstado()).isEqualTo(Constants.ESTADO_SUSPENDIDO);
        assertSesionesCortadas();
    }

    @Test
    @DisplayName("admin.cambiarEstado(inactivo) → estado 2 y sesiones cortadas")
    void adminDesactivar() {
        adminService.cambiarEstado(31L, Constants.ESTADO_INACTIVO);
        assertThat(usuario.getEstado()).isEqualTo(Constants.ESTADO_INACTIVO);
        assertSesionesCortadas();
    }

    @Test
    @DisplayName("admin.cambiarEstado(activo) no corta nada")
    void adminActivarNoCorta() {
        usuario.setEstado(Constants.ESTADO_INACTIVO);
        adminService.cambiarEstado(31L, Constants.ESTADO_ACTIVO);
        verify(refreshTokenService, never()).revocarTodosDeUsuario(any());
        assertThat(usuario.getSesionesInvalidadasEn()).isNull();
    }

    @Test
    @DisplayName("equipo.eliminar del último negocio → usuario eliminado (3) y sesiones cortadas")
    void equipoEliminarUltimoNegocio() {
        MiembroEmpresa m = new MiembroEmpresa(usuario, new com.hotclick.model.Empresa(), "EDITOR");
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(31L, 5L, 1)).thenReturn(Optional.of(m));
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(31L)).thenReturn(0L);

        equipoService.eliminar(31L, 5L, 1L);

        assertThat(usuario.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertSesionesCortadas();
    }

    @Test
    @DisplayName("equipo.eliminar con otros negocios → sigue activo y no se cortan sus sesiones")
    void equipoEliminarConOtrosNegociosNoCorta() {
        MiembroEmpresa m = new MiembroEmpresa(usuario, new com.hotclick.model.Empresa(), "EDITOR");
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(31L, 5L, 1)).thenReturn(Optional.of(m));
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(31L)).thenReturn(1L);

        equipoService.eliminar(31L, 5L, 1L);

        assertThat(usuario.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        verify(refreshTokenService, never()).revocarTodosDeUsuario(any());
    }
}
