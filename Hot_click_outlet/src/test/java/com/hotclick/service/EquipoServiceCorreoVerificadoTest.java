package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionEquipo;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Invitar ya NO crea el Usuario ni la membresía: solo emite una invitación pendiente con token de un solo uso. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EquipoService.invitar — invitación pendiente: no crea Usuario ni miembro, manda el token por correo")
class EquipoServiceCorreoVerificadoTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock NotificacionEmailService notificacionEmailService;
    @Mock TenantService tenantService;
    @Mock EmpresaRepository empresaRepository;
    @Mock InvitacionEquipoRepository invitacionRepository;
    @InjectMocks EquipoService equipoService;

    /** Real (no mock): emitir() sigue guardando la invitación con hash y vigencia sobre el repositorio mock. */
    private InvitacionEquipoService invitacionEquipoService;

    @BeforeEach
    void setUp() {
        invitacionEquipoService = new InvitacionEquipoService();
        ReflectionTestUtils.setField(invitacionEquipoService, "invitaciones", invitacionRepository);
        ReflectionTestUtils.setField(equipoService, "invitacionEquipoService", invitacionEquipoService);
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Tienda QA3");
        empresa.setId(5L);
        when(empresaRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(empresa));
    }

    @Test
    @DisplayName("correo nuevo: no se crea el Usuario ni la membresía; se guarda solo el hash y se manda el token (cuentaNueva=true)")
    void nuevoNoCreaUsuario() {
        when(usuarioRepository.findByCorreo("nuevo@test.cr")).thenReturn(Optional.empty());
        equipoService.invitar(5L, "Ana Perez", "nuevo@test.cr", "00000000", "EDITOR");

        verify(usuarioRepository, never()).save(any(Usuario.class));
        verify(miembroEmpresaRepository, never()).save(any(MiembroEmpresa.class));
        ArgumentCaptor<InvitacionEquipo> inv = ArgumentCaptor.forClass(InvitacionEquipo.class);
        verify(invitacionRepository).save(inv.capture());
        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(notificacionEmailService).enviarInvitacionMiembro(
            eq("nuevo@test.cr"), any(), eq("EDITOR"), any(), eq(true), token.capture());
        assertThat(inv.getValue().getTokenHash()).isEqualTo(InvitacionEquipoService.hashToken(token.getValue()))
            .isNotEqualTo(token.getValue());
        assertThat(inv.getValue().getVenceEn()).isAfter(inv.getValue().getFechaCreacion().plusDays(6));
    }

    @Test
    @DisplayName("cuenta existente activa: tampoco entra directo; invitación + correo cuentaNueva=false")
    void existenteNoEntraDirecto() {
        Usuario existente = new Usuario();
        existente.setId(77L);
        existente.setCorreo("ya@test.cr");
        existente.setEstado(Constants.ESTADO_ACTIVO);
        when(usuarioRepository.findByCorreo("ya@test.cr")).thenReturn(Optional.of(existente));
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(77L)).thenReturn(1L);

        equipoService.invitar(5L, "Ya Existe", "ya@test.cr", "00000000", "LECTOR");

        verify(miembroEmpresaRepository, never()).save(any(MiembroEmpresa.class));
        verify(usuarioRepository, never()).save(any(Usuario.class));
        verify(invitacionRepository).save(any(InvitacionEquipo.class));
        verify(notificacionEmailService).enviarInvitacionMiembro(
            eq("ya@test.cr"), any(), any(), any(), eq(false), anyString());
    }

    @Test
    @DisplayName("el cupo del plan cuenta las invitaciones pendientes vigentes de otros correos")
    void cupoContemplaPendientes() {
        when(invitacionRepository.contarPendientesExcluyendoCorreo(eq(5L), eq("c@test.cr"), any())).thenReturn(3L);
        equipoService.invitar(5L, "Cu Po", "c@test.cr", "00000000", "LECTOR");
        verify(tenantService).verificarLimiteUsuariosEquipo(5L, 3L);
        verify(invitacionRepository).revocarPendientes(eq(5L), eq("c@test.cr"), any());
        verify(invitacionRepository, never()).consumir(anyLong(), any());
    }
}
