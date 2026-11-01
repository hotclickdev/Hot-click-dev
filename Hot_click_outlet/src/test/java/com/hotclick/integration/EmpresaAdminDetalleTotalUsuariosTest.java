package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.EmpresaAdminService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** El detalle admin contaba usuario.empresa_id (daba 1 aqui): el miembro con otra empresa propia no aparecia. */
@DisplayName("EmpresaAdminService.detalle — totalUsuarios cuenta los miembros activos del equipo")
class EmpresaAdminDetalleTotalUsuariosTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private EmpresaAdminService empresaAdminService;

    @AfterEach
    void limpiar() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario usuario(String correo, Empresa propia) {
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario u = crearUsuario(correo, "Miembro", rol);
        u.setEmpresa(propia);
        return usuarioRepository.saveAndFlush(u);
    }

    @Test
    @DisplayName("dueño + miembro que tiene otra empresa propia + un miembro dado de baja = 2")
    void totalUsuariosCuentaMiembrosActivos() {
        Empresa equipo = empresa("adm-equipo");
        Empresa otra = empresa("adm-otra");
        Usuario dueno = usuario("adm-dueno@test.cr", equipo);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, equipo, "PROPIETARIO"));
        Usuario invitado = usuario("adm-invitado@test.cr", otra);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(invitado, equipo, "LECTOR"));
        Usuario baja = usuario("adm-baja@test.cr", otra);
        MiembroEmpresa m = new MiembroEmpresa(baja, equipo, "EDITOR");
        m.setEstado(0);
        miembroEmpresaRepository.saveAndFlush(m);

        assertThat(empresaAdminService.detalle(equipo.getId()).get("totalUsuarios")).isEqualTo(2L);
    }
}
