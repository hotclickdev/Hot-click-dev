package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("S4-24 — GET /api/negocio/mensualidad (sin Tilopay, sin POST)")
class NegocioMensualidadTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;

    private Empresa empresa;
    private Plan plan;
    private String tokenDueno;
    private String tokenPersonal;

    @BeforeEach
    void setUp() {
        plan = new Plan();
        plan.setNombre("PLAN_MENS_TEST");
        plan.setPrecioMensual(15000);
        plan.setComisionPorcentaje(new BigDecimal("6.50"));
        plan.setComisionMinimaCrc(300);
        plan = planRepository.saveAndFlush(plan);

        empresa = new Empresa();
        empresa.setNombreEmpresa("Mensualidad Test");
        empresa.setSlug("mensualidad-test");
        empresa.setCorreoEmpresa("mensualidad@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa.setPlan(plan);
        empresa.setFechaVencPlan(LocalDate.of(2026, 11, 28));
        empresa = empresaRepository.saveAndFlush(empresa);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("mens-dueno@test.cr", "Dueño", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        tokenDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);

        Usuario personal = crearUsuario("mens-personal@test.cr", "Personal", rolEmp);
        personal.setEmpresa(empresa);
        personal = usuarioRepository.saveAndFlush(personal);
        MiembroEmpresa m = new MiembroEmpresa();
        m.setUsuario(personal);
        m.setEmpresa(empresa);
        m.setRolEnEmpresa("VENDEDOR");
        m.setEstado(1);
        m.setFechaIngreso(LocalDateTime.now());
        miembroEmpresaRepository.saveAndFlush(m);
        tokenPersonal = tokenPara(personal, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planRepository.delete(plan);
    }

    @Test
    void activo_conMontosDelPlan() throws Exception {
        mockMvc.perform(get("/api/negocio/mensualidad").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.plan", is("PLAN_MENS_TEST")))
            .andExpect(jsonPath("$.data.estado", is("ACTIVO")))
            .andExpect(jsonPath("$.data.monto", is(15000)))
            .andExpect(jsonPath("$.data.fecha", is("2026-11-28")))
            .andExpect(jsonPath("$.data.porcentaje", is(6.5)))
            .andExpect(jsonPath("$.data.minimoComision", is(300)));
    }

    @Test
    void planVencidoOTiendaPausada_pendientePago_nuncaEnGracia() throws Exception {
        empresa.setEstadoPlan("VENCIDO");
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(get("/api/negocio/mensualidad").header("Authorization", tokenDueno))
            .andExpect(jsonPath("$.data.estado", is("PENDIENTE_PAGO")));
        empresa.setEstadoPlan("ACTIVO");
        empresa.setTiendaPausada(true);
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(get("/api/negocio/mensualidad").header("Authorization", tokenDueno))
            .andExpect(jsonPath("$.data.estado", is("PENDIENTE_PAGO")));
    }

    @Test
    void sinPlan_montosNull() throws Exception {
        empresa.setPlan(null);
        empresa.setFechaVencPlan(null);
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(get("/api/negocio/mensualidad").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.monto").value(nullValue()))
            .andExpect(jsonPath("$.data.porcentaje").value(nullValue()))
            .andExpect(jsonPath("$.data.minimoComision").value(nullValue()))
            .andExpect(jsonPath("$.data.fecha").value(nullValue()));
    }

    @Test
    void personal_comprador_y_admin_403() throws Exception {
        mockMvc.perform(get("/api/negocio/mensualidad").header("Authorization", tokenPersonal))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("SOLO_PROPIETARIO")));
        mockMvc.perform(post("/api/negocio/mensualidad/pago").header("Authorization", tokenPersonal))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("SOLO_PROPIETARIO")));
        mockMvc.perform(get("/api/negocio/mensualidad").header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void sinToken_401() throws Exception {
        mockMvc.perform(get("/api/negocio/mensualidad")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/negocio/mensualidad/pago")).andExpect(status().isUnauthorized());
    }

    @Test
    void pago_sinLlavesOnvo_failClosed503() throws Exception {
        mockMvc.perform(post("/api/negocio/mensualidad/pago").header("Authorization", tokenDueno))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.code", is("ONVO_NO_CONFIGURADO")))
            .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void pago_planSinPrecio_409() throws Exception {
        plan.setPrecioMensual(0);
        planRepository.saveAndFlush(plan);
        mockMvc.perform(post("/api/negocio/mensualidad/pago").header("Authorization", tokenDueno))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("PLAN_SIN_PRECIO")));
        empresa.setPlan(null);
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(post("/api/negocio/mensualidad/pago").header("Authorization", tokenDueno))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("PLAN_SIN_PRECIO")));
    }
}
