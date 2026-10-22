package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

@DisplayName("SINPE fuera de ONVO: el comprobante de invitado ya no es ruta pública")
class SinpeComprobanteInvitadoCerradoTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Sin sesión, subir comprobante de invitado no llega al controller (401/403)")
    void anonimoNoSubeComprobante() throws Exception {
        int status = mockMvc.perform(multipart("/api/sinpe/guest/HC-1/comprobante")
                .file(new MockMultipartFile("imagen", "c.png", "image/png", new byte[] {1}))
                .param("nombreRemitente", "Nombre")
                .param("correoUsuario", "a@b.cr"))
            .andReturn().getResponse().getStatus();
        assertThat(status).isIn(401, 403);
    }
}
