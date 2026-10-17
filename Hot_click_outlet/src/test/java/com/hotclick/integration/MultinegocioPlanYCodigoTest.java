package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Multinegocio — planNombre en la lista y 403 SIN_ACCESO_NEGOCIO")
class MultinegocioPlanYCodigoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planRepository.findAll().stream().filter(p -> "Negocio Plus Test".equals(p.getNombre())).forEach(planRepository::delete);
    }

    private Empresa empresa(String slug, Plan plan) {
        Empresa e = new Empresa();
        e.setNombreEmpresa("MN " + slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(plan);
        return empresaRepository.saveAndFlush(e);
    }

    private void miembro(Empresa e) {
        MiembroEmpresa m = new MiembroEmpresa();
        m.setUsuario(testUser);
        m.setEmpresa(e);
        m.setRolEnEmpresa("PROPIETARIO");
        m.setEstado(1);
        m.setFechaIngreso(LocalDateTime.now());
        miembroEmpresaRepository.saveAndFlush(m);
    }

    @Test
    void login_listaConPlanNombre() throws Exception {
        Plan pyme = new Plan();
        pyme.setNombre("Negocio Plus Test");
        pyme = planRepository.saveAndFlush(pyme);
        Empresa a = empresa("mn-plan-a", pyme);
        Empresa b = empresa("mn-plan-b", null);
        miembro(a);
        miembro(b);
        String esperado = "NEGOCIO_PLUS_TEST";
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + testUser.getCorreo() + "\",\"contrasena\":\"Test1234!\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.requiresEmpresaSelection").value(true))
            .andExpect(jsonPath("$.empresas[*].planNombre", containsInAnyOrder(esperado, null)));
    }

    @Test
    void seleccionarNegocioAjeno_403ConCodigo() throws Exception {
        Empresa ajena = empresa("mn-ajena", null);
        String sel = jwtUtil.generateEmpresaSelectionToken(testUser.getCorreo(), testUser.getId());
        mockMvc.perform(post("/api/auth/seleccionar-empresa").contentType(MediaType.APPLICATION_JSON)
                .content("{\"tempToken\":\"" + sel + "\",\"empresaId\":" + ajena.getId() + "}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.code").value("SIN_ACCESO_NEGOCIO"));
    }

    @Test
    void seleccionarSinDatos_400() throws Exception {
        mockMvc.perform(post("/api/auth/seleccionar-empresa").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
    }
}
