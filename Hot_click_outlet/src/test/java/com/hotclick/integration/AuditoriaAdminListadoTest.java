package com.hotclick.integration;

import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** BUG-S1-10: la Historia de la ficha (/api/admin/auditorias) daba 500 con filtros nulos. */
@DisplayName("[Admin] Listado de auditorías con y sin filtros")
class AuditoriaAdminListadoTest extends BaseIntegrationTest {

    @Autowired private AuditoriaAdminRepository auditoriaAdminRepository;

    private void fila(String accion, String email, Long empresaId) {
        AuditoriaAdmin a = new AuditoriaAdmin();
        a.setAccion(accion);
        a.setEntidad("EMPRESA");
        a.setEntidadId(empresaId);
        a.setAdminEmail(email);
        a.setEmpresaId(empresaId);
        a.setFecha(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(5));
        auditoriaAdminRepository.saveAndFlush(a);
    }

    @Test
    void historiaDeLaFichaYFiltros() throws Exception {
        fila("APROBAR_EMPRESA", "Ops@HotClick.lat", 9101L);
        fila("SUSPENDER_EMPRESA", "otra@hotclick.lat", 9101L);
        fila("APROBAR_EMPRESA", "ops@hotclick.lat", 9102L);

        mockMvc.perform(get("/api/admin/auditorias").header("Authorization", adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/auditorias?empresaId=9101").header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(2)));
        mockMvc.perform(get("/api/admin/auditorias?empresaId=9101&adminEmail=ops@&accion=APROBAR_EMPRESA")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)));
        mockMvc.perform(get("/api/admin/auditorias").header("Authorization", userToken))
                .andExpect(status().isForbidden());
    }
}
