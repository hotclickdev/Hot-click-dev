package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Cobro 12-oct: día 28 por defecto u 13; pago QUINCENAL o MENSUAL")
class BillingPreferenciasTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    private Empresa emp;
    private String token;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("pref"); e.setNombreComercial("pref"); e.setSlug("pref-cobro");
        e.setCorreoEmpresa("pref-cobro@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        var u = crearUsuario("pref-cobro-u@test.cr", "P", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        token = "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    @AfterEach
    void tearDown() { empresaRepository.delete(emp); }

    @Test
    void defaultsYCambios() throws Exception {
        mockMvc.perform(get("/api/billing/preferencias").header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.diaCobro").value(28))
            .andExpect(jsonPath("$.data.contraEntrega").value("DIA_SIGUIENTE"));
        mockMvc.perform(put("/api/billing/preferencias").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"diaCobro\":13,\"frecuenciaPayout\":\"mensual\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.diaCobro").value(13))
            .andExpect(jsonPath("$.data.frecuenciaPayout").value("MENSUAL"));
        mockMvc.perform(put("/api/billing/preferencias").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"diaCobro\":15}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/billing/preferencias").header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }
}
