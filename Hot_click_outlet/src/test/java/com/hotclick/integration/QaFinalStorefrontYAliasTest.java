package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** QA final 23-nov: F1 (alias con barra final) y F2 (tienda de prueba no se sirve por /api/tienda/{slug}). */
@DisplayName("QA final: /para-emprendedores/ y tienda de prueba")
class QaFinalStorefrontYAliasTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    @AfterEach
    void limpiar() {
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa tienda(String slug, boolean esPrueba) {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Tienda " + slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@qf23.test");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setEsPrueba(esPrueba);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    @Test
    @DisplayName("F1: /para-emprendedores, con barra final y con query dan 301 a /emprende, sin autenticar")
    void paraEmprendedoresRedirige() throws Exception {
        mockMvc.perform(get("/para-emprendedores"))
            .andExpect(status().isMovedPermanently()).andExpect(header().string("Location", "/emprende"));
        mockMvc.perform(get("/para-emprendedores/"))
            .andExpect(status().isMovedPermanently()).andExpect(header().string("Location", "/emprende"));
        mockMvc.perform(get("/para-emprendedores/?x=1"))
            .andExpect(status().isMovedPermanently()).andExpect(header().string("Location", "/emprende?x=1"));
        mockMvc.perform(get("/para-emprendedores?x=1"))
            .andExpect(status().isMovedPermanently()).andExpect(header().string("Location", "/emprende?x=1"));
    }

    @Test
    @DisplayName("F2: tienda es_prueba da el mismo 404 que un slug inexistente; la normal responde")
    void tiendaDePruebaEs404Uniforme() throws Exception {
        tienda("qf23-prueba", true);
        tienda("qf23-normal", false);

        String inexistente = mockMvc.perform(get("/api/tienda/qf23-no-existe"))
            .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String prueba = mockMvc.perform(get("/api/tienda/qf23-prueba"))
            .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(inexistente, prueba, "el 404 de una tienda de prueba no debe distinguirse del de un slug inexistente");

        mockMvc.perform(get("/api/tienda/qf23-prueba/productos")).andExpect(status().isNotFound());

        int normal = mockMvc.perform(get("/api/tienda/qf23-normal")).andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertNotEquals(404, normal);
    }
}
