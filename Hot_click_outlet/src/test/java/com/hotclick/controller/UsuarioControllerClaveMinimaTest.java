package com.hotclick.controller;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.auth.AuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** B1: PUT /usuarios/{id} con nuevaContrasena exige el mismo mínimo de 8 que AuthPasswordChangeHandler. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UsuarioControllerClaveMinimaTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock UsuarioService usuarioService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock CompanyScope companyScope;
    @Spy  AuthSupport authSupport = new AuthSupport();
    @InjectMocks UsuarioController controller;

    @BeforeEach
    void setUp() {
        Usuario u = new Usuario();
        u.setContrasenaHash("hash");
        when(companyScope.isAdminIT()).thenReturn(true);
        when(usuarioService.buscarPorId(1L)).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("nuevo");
    }

    @Test
    void rechaza7() {
        var resp = controller.actualizarUsuario(1L, Map.of("contrasenaActual", "vieja", "nuevaContrasena", "Abcdef1"));
        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void acepta8() {
        var resp = controller.actualizarUsuario(1L, Map.of("contrasenaActual", "vieja", "nuevaContrasena", "Abcdefg1"));
        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        verify(usuarioRepository).save(any());
    }
}
