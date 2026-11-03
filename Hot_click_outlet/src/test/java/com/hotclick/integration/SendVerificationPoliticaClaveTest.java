package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Seguridad #470: POST /api/auth/send-verification aplica la misma política de clave que el registro. */
@DisplayName("[#470] send-verification rechaza claves fuera de política")
class SendVerificationPoliticaClaveTest extends BaseIntegrationTest {

    @Test
    @DisplayName("'abcdefgh' → 400 'Te falta una mayúscula y un número'")
    void rechazaAbcdefgh() throws Exception {
        String body = "{\"nombre\":\"Ana\",\"correo\":\"politica470@example.test\","
            + "\"contrasenaHash\":\"abcdefgh\",\"declaraMayoriaEdad\":true}";
        mockMvc.perform(post("/api/auth/send-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Te falta una mayúscula y un número"));
    }
}
