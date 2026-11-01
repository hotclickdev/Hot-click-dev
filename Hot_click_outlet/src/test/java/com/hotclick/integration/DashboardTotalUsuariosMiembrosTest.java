package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.DashboardService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * QA3-P03: el dashboard decía totalUsuarios=1 con 2 miembros en el equipo. Contaba usuario.empresa_id,
 * pero un usuario que ya existía y se agrega al equipo conserva su propia empresa (EquipoService.agregarExistente).
 * La lista del equipo sí cuenta por membresía (miembro_empresa.estado = 1).
 */
@DisplayName("QA3-P03 — Dashboard.totalUsuarios cuenta los miembros activos del equipo")
class DashboardTotalUsuariosMiembrosTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private DashboardService dashboardService;

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
    @DisplayName("dueño + miembro que ya existía con otra empresa propia = 2")
    void miembroExistenteConOtraEmpresaCuenta() {
        Empresa equipo = empresa("p03-equipo");
        Empresa otra = empresa("p03-otra");
        Usuario dueno = usuario("p03-dueno@test.cr", equipo);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, equipo, "PROPIETARIO"));
        Usuario invitado = usuario("p03-invitado@test.cr", otra);   // su empresa propia es otra
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(invitado, equipo, "LECTOR"));

        assertThat(dashboardService.obtenerMetricas(equipo.getId()).getTotalUsuarios()).isEqualTo(2);
    }

    @Test
    @DisplayName("un miembro dado de baja (estado 0) no cuenta; el dueño sin fila de membresía (cuenta legada) sí")
    void bajaNoCuentaYLegadoSi() {
        Empresa equipo = empresa("p03-baja");
        usuario("p03-legado@test.cr", equipo);                       // sin fila de membresía
        Usuario baja = usuario("p03-baja@test.cr", equipo);
        MiembroEmpresa m = new MiembroEmpresa(baja, equipo, "EDITOR");
        m.setEstado(0);
        miembroEmpresaRepository.saveAndFlush(m);

        assertThat(dashboardService.obtenerMetricas(equipo.getId()).getTotalUsuarios()).isEqualTo(1);
    }
}
