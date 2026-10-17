package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Moderación → Negocios: toda empresa PENDIENTE_APROBACION aparece en la cola (sin depender de una fila de solicitud). */
class ModeracionColaNegociosTest extends BaseIntegrationTest {

    @Autowired EmpresaRepository empresaRepository;

    @AfterEach
    void limpiar() {
        empresaRepository.findAll().stream().filter(e -> e.getSlug().startsWith("qa-mod-"))
            .forEach(empresaRepository::delete);
    }

    private void empresa(String slug, boolean conFecha) {
        Empresa e = new Empresa();
        e.setNombreEmpresa("QA " + slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        if (conFecha) e.setFechaRegistro(LocalDateTime.now());
        empresaRepository.saveAndFlush(e);
    }

    @Test
    void colaNegociosListaPendientesConYSinFecha() throws Exception {
        empresa("qa-mod-pyme", true);
        empresa("qa-mod-pulseras", false);
        mockMvc.perform(get("/api/admin/solicitudes-aprobacion").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].slug", hasItems("qa-mod-pyme", "qa-mod-pulseras")));
        mockMvc.perform(get("/api/admin/solicitudes-aprobacion/metodos-cobro").header("Authorization", adminToken))
            .andExpect(status().isOk());
    }
}
