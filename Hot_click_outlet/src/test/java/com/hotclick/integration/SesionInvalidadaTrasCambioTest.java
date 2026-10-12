package com.hotclick.integration;

import com.hotclick.model.Rol;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("P1-02 | access token viejo deja de valer tras cambiar la contraseña")
class SesionInvalidadaTrasCambioTest extends BaseIntegrationTest {

    @Test
    void tokenViejoRechazadoTrasCambio() throws Exception {
        Rol rol = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        var u = crearUsuario("p102-sesion@test.cr", "Sesion", rol);
        String robado = tokenPara(u, Constants.ROL_USUARIO_FINAL);
        mockMvc.perform(get("/api/auth/2fa/status").header("Authorization", robado)).andExpect(status().isOk());

        Thread.sleep(1_100); // iat tiene precisión de segundos
        mockMvc.perform(post("/api/auth/change-password").header("Authorization", robado)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"contrasenaActual\":\"Test1234!\",\"nuevaContrasena\":\"Nueva12345\"}"))
            .andExpect(status().isOk());

        int st = mockMvc.perform(get("/api/auth/2fa/status").header("Authorization", robado))
            .andReturn().getResponse().getStatus();
        org.assertj.core.api.Assertions.assertThat(st).isIn(401, 403);

        Thread.sleep(1_100);
        String nuevo = tokenPara(usuarioRepository.findByCorreo("p102-sesion@test.cr").orElseThrow(), Constants.ROL_USUARIO_FINAL);
        mockMvc.perform(get("/api/auth/2fa/status").header("Authorization", nuevo)).andExpect(status().isOk());
    }
}
