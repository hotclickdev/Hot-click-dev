package com.hotclick.integration;

import com.hotclick.exception.CupoEmprendedorCorreoNoVerificadoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TrialEmprendedorRepository;
import com.hotclick.service.EmpresaAprobacionService;
import com.hotclick.service.UbicacionDespachoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Flujo real (JPA + servicios + contador SQL) del cupo Emprendedor: el registro no consume, la aprobación asigna el
 * puesto y el trial, el correo sin verificar bloquea, y el rechazo libera. También ejecuta el JPQL de
 * {@code TrialEmprendedorRepository.idsTrialVencidos}; contra PostgreSQL real se corre con las propiedades
 * {@code spring.datasource.*} de PG (ver docs/…): en CI corre sobre H2.
 */
@DisplayName("Cupo Emprendedor: aprobación, rechazo y JPQL del vencimiento (JPA + servicios reales)")
class CupoEmprendedorAprobacionIntegrationTest extends BaseIntegrationTest {

    @MockitoBean UbicacionDespachoService ubicacionDespachoService;

    @Autowired EmpresaAprobacionService aprobacionService;
    @Autowired EmpresaRepository empresaRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SuscripcionRepository suscripcionRepository;
    @Autowired TrialEmprendedorRepository trialRepository;

    private int n;

    @BeforeEach
    void setUpCupo() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hot_click_cupo_emprendedor_tb (id SMALLINT PRIMARY KEY, "
            + "limite INTEGER NOT NULL DEFAULT 70, usados INTEGER NOT NULL DEFAULT 0)");
        jdbcTemplate.update("DELETE FROM hot_click_cupo_emprendedor_tb");
        jdbcTemplate.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados) VALUES (1, 70, 0)");
    }

    @AfterEach
    void limpiar() {
        jdbcTemplate.update("DELETE FROM hot_click_suscripcion_tb");
        miembroEmpresaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    private int usados() {
        return jdbcTemplate.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class);
    }

    private Usuario dueno(String correo, boolean verificado) {
        Usuario u = crearUsuario(correo, "Dueno", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setCorreoVerificado(verificado);
        return usuarioRepository.saveAndFlush(u);
    }

    /** Empresa tal como la deja el registro nuevo: PENDIENTE_CUPO, oculta y sin puesto. */
    private Empresa pendiente(Usuario dueno) {
        n++;
        Empresa e = new Empresa();
        e.setNombreEmpresa("cupo" + n);
        e.setNombreComercial("cupo" + n);
        e.setSlug("cupo-it-" + n);
        e.setCorreoEmpresa("cupo-it-" + n + "@test.cr");
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        e.setFechaRegistro(LocalDateTime.now());
        e.setPlanSaas("EMPRENDEDOR");
        e.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        e.setVisibilidadPublica(false);
        e = empresaRepository.saveAndFlush(e);
        MiembroEmpresa m = new MiembroEmpresa();
        m.setUsuario(dueno);
        m.setEmpresa(e);
        m.setRolEnEmpresa("PROPIETARIO");
        m.setEstado(1);
        miembroEmpresaRepository.saveAndFlush(m);
        return e;
    }

    @Test
    @DisplayName("Registro pendiente no consume; al aprobar toma el puesto y el trial arranca ese día")
    void aprobarAsignaPuestoYTrial() {
        Empresa e = pendiente(dueno("ok@test.cr", true));
        assertThat(usados()).isZero();

        aprobacionService.aprobarYPublicar(e.getId());

        Empresa bd = empresaRepository.findById(e.getId()).orElseThrow();
        LocalDate esperado = LocalDate.now(Constants.ZONA_CR).plusDays(90);
        assertThat(usados()).isEqualTo(1);
        assertThat(bd.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        assertThat(bd.getTrialEmprendedorHasta()).isEqualTo(esperado);
        assertThat(bd.getTrialEmprendedorPos()).isEqualTo(1);
        assertThat(bd.getTrialEmprendedorTitularCorreo()).isEqualTo("ok@test.cr");
        assertThat(bd.getEstadoEmpresa()).isEqualTo("ACTIVO");
        assertThat(bd.getVisibilidadPublica()).isTrue();
    }

    @Test
    @DisplayName("Correo sin verificar: la aprobación falla y se revierte completa (sin puesto, sigue pendiente)")
    void correoSinVerificarRevierteLaAprobacion() {
        Empresa e = pendiente(dueno("nover@test.cr", false));

        assertThatThrownBy(() -> aprobacionService.aprobarYPublicar(e.getId()))
            .isInstanceOf(CupoEmprendedorCorreoNoVerificadoException.class);

        Empresa bd = empresaRepository.findById(e.getId()).orElseThrow();
        assertThat(usados()).isZero();
        assertThat(bd.getEstadoEmpresa()).isEqualTo("PENDIENTE_APROBACION");
        assertThat(bd.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        assertThat(bd.getVisibilidadPublica()).isFalse();
    }

    @Test
    @DisplayName("Una persona con dos negocios: el segundo se aprueba sin trial, oculto y con REQUIERE_MEMBRESIA")
    void segundoNegocioDeLaMismaPersona() {
        Usuario dueno = dueno("dos@test.cr", true);
        Empresa a = pendiente(dueno), b = pendiente(dueno);

        aprobacionService.aprobarYPublicar(a.getId());
        aprobacionService.aprobarYPublicar(b.getId());

        Empresa bdB = empresaRepository.findById(b.getId()).orElseThrow();
        assertThat(usados()).isEqualTo(1);
        assertThat(bdB.getTrialEmprendedorPos()).isNull();
        assertThat(bdB.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(bdB.getVisibilidadPublica()).isFalse();
    }

    @Test
    @DisplayName("Rechazar libera el puesto, deja la empresa RECHAZADO y un segundo rechazo no libera otra vez")
    void rechazarLibera() {
        Usuario dueno = dueno("rech@test.cr", true);
        Empresa a = pendiente(dueno);
        aprobacionService.aprobarYPublicar(a.getId());
        assertThat(usados()).isEqualTo(1);

        aprobacionService.rechazar(a.getId());
        aprobacionService.rechazar(a.getId());

        Empresa bd = empresaRepository.findById(a.getId()).orElseThrow();
        assertThat(usados()).isZero();
        assertThat(bd.getEstadoEmpresa()).isEqualTo("RECHAZADO");
        assertThat(bd.getTrialEmprendedorPos()).isNull();
        assertThat(bd.getTrialEmprendedorTitularUsuario()).isNull();
        assertThat(bd.getTrialEmprendedorTitularCorreo()).isNull();
    }

    @Test
    @DisplayName("Rechazar un pendiente que nunca tuvo puesto no toca el contador; empresa inexistente devuelve null")
    void rechazarPendienteNoTocaContador() {
        Empresa a = pendiente(dueno("pend@test.cr", true));
        assertThat(aprobacionService.rechazar(a.getId())).isNotNull();
        assertThat(usados()).isZero();
        assertThat(aprobacionService.rechazar(987654321L)).isNull();
    }

    @Test
    @DisplayName("JPQL idsTrialVencidos: solo TRIAL vencido con puesto, y PAST_DUE sin suscripción PAST_DUE con fecha_fin")
    void idsTrialVencidosJpql() {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        Empresa vencido = conTrial("TRIAL", 1, hoy.minusDays(1));
        Empresa vigente = conTrial("TRIAL", 2, hoy.plusDays(5));
        Empresa sinPuesto = conTrial("TRIAL", null, hoy.minusDays(3));
        Empresa pagado = conTrial("ACTIVO", 3, hoy.minusDays(3));
        Empresa pastDueSinSub = conTrial("PAST_DUE", 4, hoy.minusDays(2));
        Empresa pastDueConSub = conTrial("PAST_DUE", 5, hoy.minusDays(2));
        suscripcionPastDue(pastDueConSub, hoy.plusDays(3));

        List<Long> ids = trialRepository.idsTrialVencidos(hoy);

        assertThat(ids).containsExactlyInAnyOrder(vencido.getId(), pastDueSinSub.getId());
        assertThat(ids).doesNotContain(vigente.getId(), sinPuesto.getId(), pagado.getId(), pastDueConSub.getId());
    }

    private Empresa conTrial(String estadoPlan, Integer pos, LocalDate hasta) {
        Empresa e = pendiente(dueno("t" + (n + 1) + "@test.cr", true));
        e.setEstadoPlan(estadoPlan);
        e.setTrialEmprendedorPos(pos);
        e.setTrialEmprendedorHasta(hasta);
        return empresaRepository.saveAndFlush(e);
    }

    private void suscripcionPastDue(Empresa e, LocalDate fin) {
        Plan plan = planRepository.findByNombre("EMPRENDEDOR").orElseGet(() -> {
            Plan p = new Plan();
            p.setNombre("EMPRENDEDOR");
            return planRepository.saveAndFlush(p);
        });
        Suscripcion s = new Suscripcion();
        s.setEmpresa(e);
        s.setPlan(plan);
        s.setEstado("PAST_DUE");
        s.setFechaFin(fin);
        suscripcionRepository.saveAndFlush(s);
    }
}
