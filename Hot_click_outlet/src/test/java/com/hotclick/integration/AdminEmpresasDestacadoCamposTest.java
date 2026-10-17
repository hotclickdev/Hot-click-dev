package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Frontend #178 (punto 12): la lista y la ficha del admin traen destacado, destacadoOrden y destacadoDesde. */
@DisplayName("[ADMIN] Empresas: campos de destacado en lista y ficha")
class AdminEmpresasDestacadoCamposTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    private Empresa curada;
    private Empresa normal;

    @BeforeEach
    void setUp() {
        curada = empresa("Curada", "curada-campos-dest", true);
        normal = empresa("Normal", "normal-campos-dest", true);
    }

    @AfterEach
    void tearDown() {
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Al destacar, la lista y la ficha devuelven orden y fecha; al quitar, vuelven a null")
    void listaYFichaConCamposDeDestacado() throws Exception {
        mockMvc.perform(put("/api/admin/empresas/" + curada.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":true,\"orden\":3}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.destacadoOrden", is(3)))
            .andExpect(jsonPath("$.data.destacadoDesde", notNullValue()));

        String base = "$.data[?(@.id == " + curada.getId() + ")]";
        String otra = "$.data[?(@.id == " + normal.getId() + ")]";
        mockMvc.perform(get("/api/admin/empresas").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath(base + ".destacado", contains(true)))
            .andExpect(jsonPath(base + ".destacadoOrden", contains(3)))
            .andExpect(jsonPath(base + ".destacadoDesde", hasSize(1)))
            .andExpect(jsonPath(base + ".destacadoDesde[0]", notNullValue()))
            .andExpect(jsonPath(otra + ".destacado", contains(false)))
            .andExpect(jsonPath(otra + ".destacadoDesde", contains(nullValue())));

        mockMvc.perform(get("/api/admin/empresas/" + curada.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.destacado", is(true)))
            .andExpect(jsonPath("$.data.destacadoOrden", is(3)))
            .andExpect(jsonPath("$.data.destacadoDesde", notNullValue()));

        mockMvc.perform(put("/api/admin/empresas/" + curada.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":false}"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/empresas/" + curada.getId()).header("Authorization", adminToken))
            .andExpect(jsonPath("$.data.destacado", is(false)))
            .andExpect(jsonPath("$.data.destacadoOrden").value(nullValue()))
            .andExpect(jsonPath("$.data.destacadoDesde").value(nullValue()));
    }

    @Test
    @DisplayName("Comprador: 403 en lista y ficha del admin")
    void comprador403() throws Exception {
        mockMvc.perform(get("/api/admin/empresas").header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/empresas/" + curada.getId()).header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Orden fuera de rango u oculto: 400 y no cambia nada")
    void ordenInvalido400() throws Exception {
        mockMvc.perform(put("/api/admin/empresas/" + curada.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":true,\"orden\":1000}"))
            .andExpect(status().isBadRequest());
        Empresa oculta = empresa("Oculta", "oculta-campos-dest", false);
        mockMvc.perform(put("/api/admin/empresas/" + oculta.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":true}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/admin/empresas/" + curada.getId()).header("Authorization", adminToken))
            .andExpect(jsonPath("$.data.destacado", is(false)))
            .andExpect(jsonPath("$.data.destacadoDesde").value(nullValue()));
    }

    private Empresa empresa(String nombre, String slug, boolean visible) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(visible);
        e.setPlanSaas("PYME");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }
}
