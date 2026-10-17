package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("S2 — /api/negocio/contra-entrega (por negocio, solo propietario)")
class NegocioContraEntregaTest extends BaseIntegrationTest {

    private static final String RUTA = "/api/negocio/contra-entrega";

    @Autowired private EmpresaRepository empresaRepository;

    private Empresa empresa;
    private String tokenDueno;
    private String tokenPersonal;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Contra Entrega Test");
        empresa.setSlug("contra-entrega-test");
        empresa.setCorreoEmpresa("contra-entrega@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("ce-dueno@test.cr", "Dueño", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        tokenDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);

        Usuario personal = crearUsuario("ce-personal@test.cr", "Personal", rolEmp);
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
    }

    private void putCon(String token, String body, int status) throws Exception {
        mockMvc.perform(put(RUTA).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().is(status));
    }

    @Test
    void porDefecto_aceptaSinMinimo() throws Exception {
        mockMvc.perform(get(RUTA).header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.acepta", is(true)))
            .andExpect(jsonPath("$.data.minimo", nullValue()));
    }

    @Test
    void guardar_minimoYLuegoNoAcepta() throws Exception {
        mockMvc.perform(put(RUTA).header("Authorization", tokenDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acepta\":true,\"minimo\":5000}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.acepta", is(true)))
            .andExpect(jsonPath("$.data.minimo", is(5000)));
        assertThat(empresaRepository.findById(empresa.getId()).orElseThrow().getContraEntregaMinimoCrc()).isEqualTo(5000);

        mockMvc.perform(put(RUTA).header("Authorization", tokenDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acepta\":false,\"minimo\":5000}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.acepta", is(false)))
            .andExpect(jsonPath("$.data.minimo", nullValue()));
        Empresa e = empresaRepository.findById(empresa.getId()).orElseThrow();
        assertThat(e.isAceptaContraEntrega()).isFalse();
        assertThat(e.getContraEntregaMinimoCrc()).isNull();
    }

    @Test
    void aceptaFaltanteOInvalido_400() throws Exception {
        for (String body : new String[]{"{}", "{\"acepta\":\"si\"}", "{\"minimo\":100}"}) {
            mockMvc.perform(put(RUTA).header("Authorization", tokenDueno)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("ACEPTA_INVALIDO")));
        }
        assertThat(empresaRepository.findById(empresa.getId()).orElseThrow().isAceptaContraEntrega()).isTrue();
    }

    @Test
    void minimoInvalido_400_noGuarda() throws Exception {
        for (String m : new String[]{"0", "-1", "10.5", "\"5000\"", "1000000000"}) {
            mockMvc.perform(put(RUTA).header("Authorization", tokenDueno)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"acepta\":true,\"minimo\":" + m + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("MINIMO_INVALIDO")));
        }
        assertThat(empresaRepository.findById(empresa.getId()).orElseThrow().getContraEntregaMinimoCrc()).isNull();
    }

    @Test
    void personal_403_soloPropietario() throws Exception {
        mockMvc.perform(get(RUTA).header("Authorization", tokenPersonal))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("SOLO_PROPIETARIO")));
        mockMvc.perform(put(RUTA).header("Authorization", tokenPersonal)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acepta\":false}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("SOLO_PROPIETARIO")));
        assertThat(empresaRepository.findById(empresa.getId()).orElseThrow().isAceptaContraEntrega()).isTrue();
    }

    @Test
    void comprador_403() throws Exception {
        putCon(userToken, "{\"acepta\":false}", 403);
        mockMvc.perform(get(RUTA).header("Authorization", userToken)).andExpect(status().isForbidden());
    }

    @Test
    void sinToken_401o403() throws Exception {
        mockMvc.perform(get(RUTA)).andExpect(status().is(anyOf(is(401), is(403))));
    }
}
