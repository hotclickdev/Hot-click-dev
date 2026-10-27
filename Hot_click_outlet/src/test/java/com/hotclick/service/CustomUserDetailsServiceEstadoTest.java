package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CustomUserDetailsService — solo cuentas activas (estado 1)")
class CustomUserDetailsServiceEstadoTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock PermisoRepository permisoRepository;
    @InjectMocks CustomUserDetailsService service;

    private Usuario conEstado(int estado) {
        Usuario u = new Usuario();
        u.setId(8L);
        u.setCorreo("estado@test.cr");
        u.setContrasenaHash("hash");
        u.setEstado(estado);
        u.setRoles(new ArrayList<>());
        when(usuarioRepository.findByCorreo("estado@test.cr")).thenReturn(Optional.of(u));
        when(permisoRepository.findPermisosByUsuarioId(8L)).thenReturn(List.of());
        return u;
    }

    @ParameterizedTest(name = "estado {0} → DisabledException")
    @ValueSource(ints = {2, 3, 4, 5})
    @DisplayName("estado distinto de 1 → no carga el usuario")
    void noActivoSeRechaza(int estado) {
        conEstado(estado);
        assertThatThrownBy(() -> service.loadUserByUsername("estado@test.cr"))
            .isInstanceOf(DisabledException.class);
    }

    @Test
    @DisplayName("estado 1 → carga normal")
    void activoCarga() {
        conEstado(1);
        UserDetails ud = service.loadUserByUsername("estado@test.cr");
        assertThat(ud.getUsername()).isEqualTo("estado@test.cr");
        assertThat(ud.isEnabled()).isTrue();
    }
}
