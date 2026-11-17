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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Una cuenta existente que no está activa no recibe invitación usable (la reactivación queda para post-lanzamiento),
 * pero quien invita NO ve ningún error distinto: invitar() retorna normal (no se puede enumerar el estado de la cuenta).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EquipoService.invitar — cuenta no activa: sin error, sin token, sin reactivar")
class EquipoServiceUsuarioSuspendidoTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock NotificacionEmailService notificacionEmailService;
    @Mock TenantService tenantService;
    @Mock EmpresaRepository empresaRepository;
    @Mock InvitacionEquipoRepository invitacionRepository;
    @InjectMocks EquipoService equipoService;

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setId(5L);
        when(empresaRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(empresa));
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(77L)).thenReturn(1L);
    }

    private Usuario existente(int estado) {
        Usuario u = new Usuario();
        u.setId(77L);
        u.setCorreo("susp@test.cr");
        u.setEstado(estado);
        when(usuarioRepository.findByCorreo("susp@test.cr")).thenReturn(Optional.of(u));
        return u;
    }

    private void sinInvitacionNiCorreo() {
        verify(invitacionRepository, never()).save(any(InvitacionEquipo.class));
        verify(miembroEmpresaRepository, never()).save(any(MiembroEmpresa.class));
        verify(usuarioRepository, never()).save(any(Usuario.class));
        verify(notificacionEmailService, never()).enviarInvitacionMiembro(any(), any(), any(), any(), anyBoolean(), any());
    }

    @Test
    @DisplayName("suspendido (4), eliminado (3), inactivo (2), pendiente (5): no lanza error, no hay token ni correo ni reactivación")
    void noActivosSinErrorNiToken() {
        for (int estado : new int[] {Constants.ESTADO_SUSPENDIDO, Constants.ESTADO_ELIMINADO,
                Constants.ESTADO_INACTIVO, Constants.ESTADO_PENDIENTE}) {
            Usuario u = existente(estado);
            assertThatCode(() -> equipoService.invitar(5L, "Susp Endido", "susp@test.cr", "00000000", "LECTOR"))
                .doesNotThrowAnyException();
            org.assertj.core.api.Assertions.assertThat(u.getEstado()).isEqualTo(estado);
        }
        sinInvitacionNiCorreo();
    }

    @Test
    @DisplayName("ya es miembro activo de este equipo: sin error y sin token que lo 'vuelva a agregar'")
    void yaMiembroSinToken() {
        existente(Constants.ESTADO_ACTIVO);
        when(miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(77L, 5L, 1)).thenReturn(true);
        assertThatCode(() -> equipoService.invitar(5L, "Ya Miembro", "susp@test.cr", "00000000", "LECTOR"))
            .doesNotThrowAnyException();
        sinInvitacionNiCorreo();
    }

    @Test
    @DisplayName("en el tope de 20 negocios: sin error y sin token")
    void topeNegociosSinToken() {
        existente(Constants.ESTADO_ACTIVO);
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(77L)).thenReturn(20L);
        assertThatCode(() -> equipoService.invitar(5L, "Tope Veinte", "susp@test.cr", "00000000", "LECTOR"))
            .doesNotThrowAnyException();
        sinInvitacionNiCorreo();
    }

    @Test
    @DisplayName("activo (1) con cupo: se emite la invitación, pero todavía NO se crea membresía")
    void activoRecibeInvitacionPendiente() {
        existente(Constants.ESTADO_ACTIVO);
        equipoService.invitar(5L, "Ac Tivo", "susp@test.cr", "00000000", "LECTOR");
        verify(invitacionRepository).save(any(InvitacionEquipo.class));
        verify(miembroEmpresaRepository, never()).save(any(MiembroEmpresa.class));
    }
}
