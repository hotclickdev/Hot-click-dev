package com.hotclick.service;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUsuarioOperadoresTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @InjectMocks private AdminUsuarioService service;

    @Test
    void operadoresSoloTraenNombreCorreoYRol() {
        when(usuarioRepository.findOperadores()).thenReturn(List.of(operador()));

        List<Map<String, Object>> filas = service.listarOperadores();

        assertThat(filas).hasSize(1);
        assertThat(filas.get(0)).containsEntry("correo", "admin@hotclick.test")
            .containsEntry("nombre", "Ada Admin")
            .containsEntry("rol", "ADMIN")
            .doesNotContainKeys("identificacion", "telefono", "notasInternas");
    }

    private static Usuario operador() {
        Rol rol = new Rol();
        rol.setNombreRol("ADMIN");
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setNombre("Ada");
        usuario.setApellidoPaterno("Admin");
        usuario.setCorreo("admin@hotclick.test");
        usuario.setIdentificacion("1-1111-1111");
        usuario.setTelefono("88880000");
        usuario.setRoles(List.of(rol));
        return usuario;
    }
}
