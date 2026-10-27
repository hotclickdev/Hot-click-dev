package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * QA3 (seguridad): el miembro invitado por correo nace con el correo SIN verificar.
 * Antes heredaba el default de Usuario (true) y pasaba los gates de "correo verificado"
 * (pago de plan, borrado de datos de cuentas SSO, pago de suspensión) sin haber probado el correo.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("QA3 — EquipoService.invitar: el invitado nuevo arranca con correoVerificado=false")
class EquipoServiceCorreoVerificadoTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock NotificacionEmailService notificacionEmailService;
    @Mock TenantService tenantService;
    @InjectMocks EquipoService equipoService;

    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Tienda QA3");
        Rol rol = new Rol();
        rol.setNombreRol(Constants.ROL_EMPRENDEDOR);
        when(rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)).thenReturn(Optional.of(rol));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Usuario invitarYCapturar(String correo, String rolEnEmpresa) {
        when(usuarioRepository.findByCorreo(correo)).thenReturn(Optional.empty());
        equipoService.invitar(empresa, null, "Ana Perez", correo, "Temporal1!", "88887777", rolEnEmpresa);
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("LECTOR invitado nuevo: correoVerificado=false")
    void lectorInvitadoNoVerificado() {
        Usuario u = invitarYCapturar("lector-qa3@test.cr", "LECTOR");
        assertThat(u.getCorreoVerificado()).isFalse();
    }

    @Test
    @DisplayName("EDITOR invitado nuevo: correoVerificado=false")
    void editorInvitadoNoVerificado() {
        Usuario u = invitarYCapturar("editor-qa3@test.cr", "EDITOR");
        assertThat(u.getCorreoVerificado()).isFalse();
    }

    @Test
    @DisplayName("Usuario ya existente que se agrega al equipo conserva su estado de verificación")
    void existenteConservaVerificacion() {
        Usuario existente = new Usuario();
        existente.setId(77L);
        existente.setCorreo("ya@test.cr");
        existente.setCorreoVerificado(true);
        when(usuarioRepository.findByCorreo("ya@test.cr")).thenReturn(Optional.of(existente));
        empresa.setId(5L);
        when(miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(77L, 5L, 1)).thenReturn(false);
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(77L)).thenReturn(1L);
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(77L, 5L)).thenReturn(Optional.empty());
        when(miembroEmpresaRepository.save(any(MiembroEmpresa.class))).thenAnswer(i -> i.getArgument(0));

        equipoService.invitar(empresa, 5L, "Ya Existe", "ya@test.cr", "x", "00000000", "LECTOR");

        assertThat(existente.getCorreoVerificado()).isTrue();
    }
}
