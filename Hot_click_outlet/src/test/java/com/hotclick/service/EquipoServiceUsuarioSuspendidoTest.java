package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
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
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** agregarExistente no validaba el estado: un usuario suspendido (4), inactivo o eliminado entraba al equipo. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EquipoService.invitar — un usuario existente que no está activo no entra al equipo")
class EquipoServiceUsuarioSuspendidoTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock NotificacionEmailService notificacionEmailService;
    @Mock TenantService tenantService;
    @Mock EmpresaRepository empresaRepository;
    @InjectMocks EquipoService equipoService;

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setId(5L);
        when(empresaRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(empresa));
        Rol rol = new Rol();
        rol.setNombreRol(Constants.ROL_EMPRENDEDOR);
        when(rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)).thenReturn(Optional.of(rol));
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(77L)).thenReturn(1L);
    }

    private void invitarConEstado(int estado) {
        Usuario existente = new Usuario();
        existente.setId(77L);
        existente.setCorreo("susp@test.cr");
        existente.setEstado(estado);
        when(usuarioRepository.findByCorreo("susp@test.cr")).thenReturn(Optional.of(existente));
        equipoService.invitar(5L, "Susp Endido", "susp@test.cr", "x", "00000000", "LECTOR");
    }

    @Test
    @DisplayName("suspendido (4): se rechaza y no se crea la membresía ni se envía correo")
    void suspendidoRechazado() {
        assertThatThrownBy(() -> invitarConEstado(Constants.ESTADO_SUSPENDIDO))
            .isInstanceOf(IllegalArgumentException.class);
        verify(miembroEmpresaRepository, never()).save(any(MiembroEmpresa.class));
        verify(usuarioRepository, never()).save(any(Usuario.class));
        verify(notificacionEmailService, never()).enviarInvitacionMiembro(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("eliminado (3) sin membresía previa en este equipo, inactivo (2) y pendiente (5): también se rechazan")
    void eliminadoEInactivoRechazados() {
        assertThatThrownBy(() -> invitarConEstado(Constants.ESTADO_ELIMINADO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> invitarConEstado(Constants.ESTADO_INACTIVO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> invitarConEstado(Constants.ESTADO_PENDIENTE)).isInstanceOf(IllegalArgumentException.class);
        verify(miembroEmpresaRepository, never()).save(any(MiembroEmpresa.class));
    }

    @Test
    @DisplayName("eliminado (3) que ya fue miembro de ESTE equipo (se quitó): el reingreso sigue permitido (T-EQ-025)")
    void eliminadoConMembresiaPreviaReingresa() {
        MiembroEmpresa previo = new MiembroEmpresa(new Usuario(), new Empresa(), "EDITOR");
        previo.setEstado(0);
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(77L, 5L)).thenReturn(Optional.of(previo));
        when(miembroEmpresaRepository.save(any(MiembroEmpresa.class))).thenAnswer(i -> i.getArgument(0));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        invitarConEstado(Constants.ESTADO_ELIMINADO);
        verify(miembroEmpresaRepository).save(previo);
    }

    @Test
    @DisplayName("activo (1): sigue entrando")
    void activoEntra() {
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(77L, 5L)).thenReturn(Optional.empty());
        when(miembroEmpresaRepository.save(any(MiembroEmpresa.class))).thenAnswer(i -> i.getArgument(0));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        invitarConEstado(Constants.ESTADO_ACTIVO);
        verify(miembroEmpresaRepository).save(any(MiembroEmpresa.class));
    }
}
