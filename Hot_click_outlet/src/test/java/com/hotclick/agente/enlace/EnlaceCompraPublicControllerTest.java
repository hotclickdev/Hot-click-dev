package com.hotclick.agente.enlace;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Prueba de acceso: códigos inválidos, inexistentes o vencidos responden el mismo 404. */
class EnlaceCompraPublicControllerTest {

    private EnlaceCompraAperturaService apertura;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        apertura = mock(EnlaceCompraAperturaService.class);
        when(apertura.abrir(anyString())).thenReturn(Optional.empty());
        mvc = MockMvcBuilders.standaloneSetup(new EnlaceCompraPublicController(apertura)).build();
    }

    @Test
    void codigoInvalidoInexistenteOVencido_mismoCuerpo404() throws Exception {
        String cuerpo404 = null;
        for (String c : List.of("corto", "A".repeat(24), "%27%20OR%201=1--", "..%2F..%2Fetc")) {
            String cuerpo = mvc.perform(get("/api/public/enlace/" + c))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsString();
            cuerpo = cuerpo.replaceAll("\"timestamp\":\"[^\"]*\"", "");
            if (cuerpo404 == null) cuerpo404 = cuerpo;
            org.assertj.core.api.Assertions.assertThat(cuerpo).isEqualTo(cuerpo404);
        }
    }

    @Test
    void codigoValido_devuelveElCarritoSinDatosInternos() throws Exception {
        EnlaceAbiertoDto dto = new EnlaceAbiertoDto(LocalDateTime.of(2026, 12, 8, 10, 0), null, "Ana", "****0000",
            false, false, 4500, 4500,
            List.of(new EnlaceAbiertoDto.Item(11L, "Leche", null, 3, 3, 1500, 1500, true)));
        when(apertura.abrir("A".repeat(24))).thenReturn(Optional.of(dto));

        mvc.perform(get("/api/public/enlace/" + "A".repeat(24)))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.data.totalActual").value(4500))
            .andExpect(jsonPath("$.data.telefonoMascara").value("****0000"))
            .andExpect(jsonPath("$.data.id").doesNotExist())
            .andExpect(jsonPath("$.data.pedidoId").doesNotExist())
            .andExpect(jsonPath("$.data.contactoExterno").doesNotExist())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("WHATSAPP"))));
    }
}
