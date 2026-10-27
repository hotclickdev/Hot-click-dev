package com.hotclick.integration;

import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.EquipoService;
import com.hotclick.service.TenantService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

/**
 * El límite de usuarios del plan se calculaba con usuario.empresa_id. Un usuario que ya existía y entra al equipo
 * conserva su propia empresa (EquipoService.agregarExistente) y por eso no contaba: el equipo podía superar
 * plan.maxUsuarios. Ahora cuenta igual que la lista del equipo (miembro_empresa.estado = 1, más cuentas legadas
 * sin fila de membresía).
 */
@DisplayName("Límite de usuarios del plan cuenta a los miembros activos del equipo")
class LimiteUsuariosEquipoMiembrosTest extends BaseIntegrationTest {

    @MockitoSpyBean private EmpresaRepository empresaRepository;
    @Autowired private EquipoService equipoService;
    @Autowired private PlanRepository planRepository;
    @Autowired private TenantService tenantService;

    private Plan plan;

    @AfterEach
    void limpiar() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        if (plan != null) planRepository.deleteById(plan.getId());
    }

    private Empresa empresa(String slug, int maxUsuarios) {
        if (plan == null) {
            Plan p = new Plan();
            p.setNombre("LIMUSR_" + System.nanoTime());
            p.setMaxUsuarios(maxUsuarios);
            plan = planRepository.saveAndFlush(p);
        }
        return empresaConPlan(slug);
    }

    private Empresa empresaConPlan(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(plan);
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario usuario(String correo, Empresa propia) {
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario u = crearUsuario(correo, "Miembro", rol);
        u.setEmpresa(propia);
        return usuarioRepository.saveAndFlush(u);
    }

    @Test
    @DisplayName("plan de 2 usuarios, dueño + miembro que tiene otra empresa propia: el tercero se rechaza")
    void miembroConOtraEmpresaPropiaCuentaParaElLimite() {
        Empresa equipo = empresa("limusr-equipo", 2);
        Empresa otra = empresaConPlan("limusr-otra");
        Usuario dueno = usuario("limusr-dueno@test.cr", equipo);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, equipo, "PROPIETARIO"));
        Usuario invitado = usuario("limusr-invitado@test.cr", otra);   // su empresa propia es otra
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(invitado, equipo, "LECTOR"));

        assertThatThrownBy(() -> tenantService.verificarLimiteUsuariosEquipo(equipo.getId()))
            .isInstanceOf(PlanLimitException.class);
    }

    @Test
    @DisplayName("un miembro dado de baja no ocupa cupo (aunque su empresa propia sea la del equipo); la cuenta legada sin membresía sí")
    void bajaNoOcupaCupoYLegadoSi() {
        Empresa equipo = empresa("limusr-baja", 2);
        usuario("limusr-legado@test.cr", equipo);                    // sin fila de membresía: cuenta (1/2)
        Usuario baja = usuario("limusr-baja@test.cr", equipo);       // empresa propia = equipo, pero membresía dada de baja
        MiembroEmpresa m = new MiembroEmpresa(baja, equipo, "EDITOR");
        m.setEstado(0);
        miembroEmpresaRepository.saveAndFlush(m);

        assertThatCode(() -> tenantService.verificarLimiteUsuariosEquipo(equipo.getId())).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("getTenantUso reporta los mismos miembros activos que usa el límite")
    void tenantUsoCuentaMiembros() {
        Empresa equipo = empresa("limusr-uso", 5);
        Empresa otra = empresaConPlan("limusr-otra3");
        Usuario dueno = usuario("limusr-uso-dueno@test.cr", equipo);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, equipo, "PROPIETARIO"));
        Usuario invitado = usuario("limusr-uso-inv@test.cr", otra);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(invitado, equipo, "EDITOR"));

        assertThat(tenantService.getTenantUso(equipo.getId()).get("usuarios")).isEqualTo(2L);
    }

    @Test
    @DisplayName("invitar toma lock de la empresa antes de contar (dos invitaciones simultáneas no superan el cupo) y rechaza al llegar al tope")
    void invitarBloqueaEmpresaYRespetaTope() {
        Empresa equipo = empresa("limusr-lock", 2);
        Empresa otra = empresaConPlan("limusr-otra4");
        Usuario dueno = usuario("limusr-lock-dueno@test.cr", equipo);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, equipo, "PROPIETARIO"));
        Usuario existente = usuario("limusr-lock-inv@test.cr", otra);   // ya existe, con empresa propia en otro tenant
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(existente, equipo, "EDITOR"));

        assertThatThrownBy(() -> equipoService.invitar(
            equipo, equipo.getId(), "Nuevo Tercero", "limusr-tercero@test.cr", "Temporal123", "88888888", "LECTOR"))
            .isInstanceOf(PlanLimitException.class);
        verify(empresaRepository).findByIdForUpdate(equipo.getId());
    }
}
