package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** P1-03: el refresh mantiene el negocio y el rol elegidos con cambiar-negocio. */
class AuthRefreshNegocioActivoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    private final ObjectMapper om = new ObjectMapper();

    @AfterEach
    void limpiar() {
        refreshTokenRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    void refreshTrasCambiarNegocio_conservaNegocioYRol_yVuelveSiPierdeMembresia() throws Exception {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa a = empresa("ref-a-" + System.nanoTime());
        Empresa b = empresa("ref-b-" + System.nanoTime());
        Usuario u = crearUsuario("ref-multi@test.cr", "Multi", rolEmp);
        u.setEmpresa(a);
        u = usuarioRepository.saveAndFlush(u);
        MiembroEmpresa mb = miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, b, "EDITOR"));
        String token = "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, a.getId(), a.getSlug());

        MvcResult cambio = mockMvc.perform(post("/api/auth/cambiar-negocio").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"empresaId\":" + b.getId() + "}"))
            .andExpect(status().isOk()).andReturn();
        Cookie cookie = cambio.getResponse().getCookie("hotclick_refresh");
        assertThat(cookie).as("cambiar-negocio entrega el refresh nuevo").isNotNull();

        MvcResult r1 = mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andReturn();
        assertThat(r1.getResponse().getStatus()).as(r1.getResponse().getContentAsString()).isEqualTo(200);
        String at1 = om.readTree(r1.getResponse().getContentAsString()).get("accessToken").asText();
        assertThat(jwtUtil.extractEmpresaId(at1)).isEqualTo(b.getId());

        mb.setEstado(0);
        miembroEmpresaRepository.saveAndFlush(mb);
        Cookie cookie2 = r1.getResponse().getCookie("hotclick_refresh");
        MvcResult r2 = mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000").cookie(cookie2)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isOk()).andReturn();
        JsonNode j2 = om.readTree(r2.getResponse().getContentAsString());
        assertThat(jwtUtil.extractEmpresaId(j2.get("accessToken").asText())).isEqualTo(a.getId());
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }
}
