package com.hotclick.service;

import com.hotclick.exception.EnlaceNoVigenteException;
import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionEquipo;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Carrera de dos aceptaciones del mismo token: la que pierde ve {@code consumir(...) == 0} (la otra ya lo marcó) y
 * debe terminar en 410 SIN crear membresía ni tocar la cuenta. Quita el chequeo {@code != 1} y estos tests fallan.
 * La atomicidad real del UPDATE la prueba InvitacionEquipoConcurrentePostgresTest (job ONVO/CI con HC_PG_TEST_URL).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Aceptar invitación: si consumir() no marca exactamente 1 fila, 410 y sin membresía")
class InvitacionEquipoConsumirUnitTest {

    @Mock InvitacionEquipoRepository invitaciones;
    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock EmpresaRepository empresaRepository;
    @Mock TenantService tenantService;
    @Mock SesionesUsuarioService sesionesUsuarioService;
    @Mock OtpService otpService;
    @Mock com.hotclick.repository.WebAuthnCredentialRepository webAuthnCredentialRepository;
    @InjectMocks InvitacionEquipoService servicio;

    private InvitacionEquipo inv;
    private Usuario activo;

    @BeforeEach
    void setUp() {
        Empresa emp = new Empresa();
        emp.setId(7L);
        inv = new InvitacionEquipo();
        org.springframework.test.util.ReflectionTestUtils.setField(inv, "id", 1L);
        inv.setEmpresa(emp);
        inv.setCorreo("carrera@test.cr");
        inv.setNombre("Persona Carrera");
        inv.setRolEnEmpresa("EDITOR");
        inv.setVenceEn(LocalDateTime.now(Constants.ZONA_CR).plusDays(1));
        when(invitaciones.findByTokenHash(any())).thenReturn(Optional.of(inv));
        when(empresaRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(emp));
        Rol rolEmp = new Rol();
        rolEmp.setNombreRol(Constants.ROL_EMPRENDEDOR);
        when(rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)).thenReturn(Optional.of(rolEmp));
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(anyLong())).thenReturn(0L);
        activo = new Usuario();
        activo.setId(5L);
        activo.setCorreo("carrera@test.cr");
        activo.setEstado(Constants.ESTADO_ACTIVO);
        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(activo));
        when(usuarioRepository.findByCorreo("carrera@test.cr")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hash");
    }

    @Test
    @DisplayName("cuenta existente: consumir()=0 → 410 y no se guarda membresía ni usuario")
    void cuentaExistentePierdeLaCarrera() {
        when(invitaciones.consumir(anyLong(), any())).thenReturn(0);
        assertThatThrownBy(() -> servicio.aceptarCuentaExistente("tok", activo))
            .isInstanceOfSatisfying(EnlaceNoVigenteException.class, e -> assertThat(e.getStatus().value()).isEqualTo(410));
        verify(miembroEmpresaRepository, never()).save(any());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("cuenta nueva: consumir()=0 → 410 y no se crea usuario ni membresía")
    void cuentaNuevaPierdeLaCarrera() {
        when(invitaciones.consumir(anyLong(), any())).thenReturn(0);
        assertThatThrownBy(() -> servicio.aceptarCuentaNueva("tok", "Clave12345"))
            .isInstanceOfSatisfying(EnlaceNoVigenteException.class, e -> assertThat(e.getStatus().value()).isEqualTo(410));
        verify(usuarioRepository, never()).save(any());
        verify(miembroEmpresaRepository, never()).save(any());
    }

    @Test
    @DisplayName("control: consumir()=1 → la cuenta existente entra con el rol de la invitación")
    void ganadoraEntra() {
        when(invitaciones.consumir(anyLong(), any())).thenReturn(1);
        servicio.aceptarCuentaExistente("tok", activo);
        verify(miembroEmpresaRepository).save(org.mockito.ArgumentMatchers.argThat(m -> "EDITOR".equals(m.getRolEnEmpresa())));
    }
}
