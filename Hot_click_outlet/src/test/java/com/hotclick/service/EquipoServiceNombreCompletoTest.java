package com.hotclick.service;

import com.hotclick.model.Empresa;
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

/** QA3-P02: el nombre completo de la invitación se parte con el apellido al final, no la primera palabra sola como nombre. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("QA3-P02 — EquipoService.invitar: partición de nombre y apellido")
class EquipoServiceNombreCompletoTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock NotificacionEmailService notificacionEmailService;
    @Mock TenantService tenantService;
    @Mock com.hotclick.repository.EmpresaRepository empresaRepository;
    @InjectMocks EquipoService equipoService;

    @BeforeEach
    void setUp() {
        Rol rol = new Rol();
        rol.setNombreRol(Constants.ROL_EMPRENDEDOR);
        when(rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)).thenReturn(Optional.of(rol));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usuarioRepository.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Usuario invitar(String nombreCompleto) {
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Tienda QA3");
        empresa.setId(9L);
        when(empresaRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(empresa));
        equipoService.invitar(9L, nombreCompleto, "n@test.cr", "Temporal1!", "88887777", "EDITOR");
        ArgumentCaptor<Usuario> c = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(c.capture());
        return c.getValue();
    }

    @Test
    @DisplayName("caso del QA: \"PRUEBA QA3 Editor\" -> nombre \"PRUEBA QA3\", apellido \"Editor\"")
    void casoQa() {
        Usuario u = invitar("PRUEBA QA3 Editor");
        assertThat(u.getNombre()).isEqualTo("PRUEBA QA3");
        assertThat(u.getApellidoPaterno()).isEqualTo("Editor");
        assertThat(u.getApellidoMaterno()).isNull();
    }

    @Test
    @DisplayName("dos palabras: nombre y apellido, igual que antes")
    void dosPalabras() {
        Usuario u = invitar("  Ana   Pérez ");
        assertThat(u.getNombre()).isEqualTo("Ana");
        assertThat(u.getApellidoPaterno()).isEqualTo("Pérez");
    }

    @Test
    @DisplayName("cuatro palabras: las dos últimas son los apellidos")
    void cuatroPalabras() {
        Usuario u = invitar("Juan Carlos Pérez Mora");
        assertThat(u.getNombre()).isEqualTo("Juan Carlos");
        assertThat(u.getApellidoPaterno()).isEqualTo("Pérez");
        assertThat(u.getApellidoMaterno()).isEqualTo("Mora");
    }

    @Test
    @DisplayName("una palabra: queda de nombre y el apellido (NOT NULL) en \"Miembro\", igual que antes")
    void unaPalabra() {
        Usuario u = invitar("Ana");
        assertThat(u.getNombre()).isEqualTo("Ana");
        assertThat(u.getApellidoPaterno()).isEqualTo("Miembro");
    }
}
