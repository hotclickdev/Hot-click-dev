package com.hotclick.service.copilot;

import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Rol real del panel web: esDueno calculado en el servidor")
class AiCopilotRolResolverTest {

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final MiembroEmpresaRepository miembros = mock(MiembroEmpresaRepository.class);
    private final AiCopilotRolResolver resolver = new AiCopilotRolResolver();

    AiCopilotRolResolverTest() {
        TelegramFlujoSupport soporte = new TelegramFlujoSupport();
        ReflectionTestUtils.setField(soporte, "miembroEmpresaRepository", miembros);
        ReflectionTestUtils.setField(resolver, "usuarioRepository", usuarios);
        ReflectionTestUtils.setField(resolver, "flujoSupport", soporte);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private void autenticar(String correo) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(correo, "n/a", List.of()));
    }

    private Usuario usuario(long id, Long empresaId) {
        Usuario u = new Usuario();
        u.setId(id);
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(empresaId);
        u.setEmpresa(e);
        when(usuarios.findByCorreo(any())).thenReturn(Optional.of(u));
        return u;
    }

    private void membresiaActiva(Usuario u, String rol) {
        com.hotclick.model.MiembroEmpresa m = new com.hotclick.model.MiembroEmpresa();
        m.setRolEnEmpresa(rol);
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(eq(u.getId()), eq(7L), eq(1))).thenReturn(Optional.of(m));
    }

    @Test
    @DisplayName("PROPIETARIO activo → true")
    void propietario() {
        autenticar("dueno@x.com");
        membresiaActiva(usuario(1, 7L), "PROPIETARIO");
        assertThat(resolver.esDuenoActual(7L)).isTrue();
    }

    @Test
    @DisplayName("LECTOR activo → false")
    void lector() {
        autenticar("lector@x.com");
        membresiaActiva(usuario(2, 7L), "LECTOR");
        assertThat(resolver.esDuenoActual(7L)).isFalse();
    }

    @Test
    @DisplayName("Ex-miembro (fila estado 0, conserva usuario.empresaId) → false")
    void exMiembro() {
        autenticar("ex@x.com");
        Usuario u = usuario(3, 7L);
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(eq(u.getId()), anyLong(), eq(1))).thenReturn(Optional.empty());
        when(miembros.findByUsuarioIdAndEmpresaId(u.getId(), 7L))
            .thenReturn(Optional.of(new com.hotclick.model.MiembroEmpresa()));
        assertThat(resolver.esDuenoActual(7L)).isFalse();
    }

    @Test
    @DisplayName("Dueño legado sin ninguna fila de membresía → true")
    void duenoLegado() {
        autenticar("legado@x.com");
        Usuario u = usuario(4, 7L);
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(eq(u.getId()), anyLong(), eq(1))).thenReturn(Optional.empty());
        when(miembros.findByUsuarioIdAndEmpresaId(u.getId(), 7L)).thenReturn(Optional.empty());
        assertThat(resolver.esDuenoActual(7L)).isTrue();
    }

    @Test
    @DisplayName("Fail-closed: sin autenticación, usuario inexistente o sin empresa → false")
    void failClosed() {
        assertThat(resolver.esDuenoActual(7L)).isFalse();
        autenticar("nadie@x.com");
        when(usuarios.findByCorreo(any())).thenReturn(Optional.empty());
        assertThat(resolver.esDuenoActual(7L)).isFalse();
        assertThat(resolver.esDuenoActual(null)).isFalse();
    }
}
