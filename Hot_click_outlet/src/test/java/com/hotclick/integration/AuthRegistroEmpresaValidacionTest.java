package com.hotclick.integration;

import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** P2-01: registro-empresa y nuevo-negocio aplican las restricciones de RegistroEmpresaDTO. */
@DisplayName("P2-01 — @Valid en RegistroEmpresaDTO")
class AuthRegistroEmpresaValidacionTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    @Test
    void registroEmpresa_passwordCortaYCorreoInvalido_400() throws Exception {
        String body = """
            {"nombreEmpresa":"Val Uno","correoEmpresa":"val-uno@test.cr","nombreAdmin":"Ana",
             "correoAdmin":"no-es-correo","passwordAdmin":"123"}
            """;
        mockMvc.perform(post("/api/auth/registro-empresa")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
        assertThat(usuarioRepository.findByCorreo("no-es-correo")).isEmpty();
        assertThat(empresaRepository.existsByCorreoEmpresa("val-uno@test.cr")).isFalse();
    }

    @Test
    void nuevoNegocio_nombreEmpresaLargo_400_sinPedirDatosDeCuenta() throws Exception {
        String largo = "x".repeat(151);
        mockMvc.perform(post("/api/auth/nuevo-negocio")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreEmpresa\":\"" + largo + "\",\"correoEmpresa\":\"val-dos@test.cr\"}"))
            .andExpect(status().isBadRequest());
        assertThat(empresaRepository.existsByCorreoEmpresa("val-dos@test.cr")).isFalse();
    }
}
