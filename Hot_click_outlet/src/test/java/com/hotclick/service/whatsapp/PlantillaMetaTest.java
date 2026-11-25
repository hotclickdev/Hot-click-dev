package com.hotclick.service.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PlantillaMetaTest {

    @Test
    void catalogoCoherente() {
        for (PlantillaMeta p : PlantillaMeta.values()) {
            assertThat(p.nombreTecnico).matches("[a-z0-9_]+");
            for (int i = 1; i <= p.claves.size(); i++) assertThat(p.cuerpo).contains("{{" + i + "}}");
            assertThat(p.cuerpo).doesNotContain("{{" + (p.claves.size() + 1) + "}}");
            // Meta: la variable no puede abrir ni cerrar el cuerpo
            assertThat(p.cuerpo).doesNotStartWith("{{").doesNotEndWith("}}");
        }
    }

    @Test
    void paraEscenario() {
        assertThat(PlantillaMeta.paraEscenario("GUIA_ASIGNADA")).contains(PlantillaMeta.GUIA_ASIGNADA);
        assertThat(PlantillaMeta.paraEscenario("REACTIVACION")).isEmpty();
    }

    @Test
    void parametrosSaneados() {
        List<String> p = PlantillaMeta.GUIA_ASIGNADA.parametros(
            Map.of("nombre", "Ana\nMora", "numeroPedido", "  ", "courier", "Correos   CR"));
        assertThat(p).containsExactly("Ana Mora", "-", "Correos CR", "-");
    }

    @Test
    void jsonDePlantillaBienFormado() throws Exception {
        Map<String, Object> body = WhatsAppMetaApiClient.construirCuerpoPlantilla(
            "50600000004", PlantillaMeta.PAGO_CONFIRMADO, List.of("Ana", "ORD-1", "12.500"));
        JsonNode n = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(body));
        assertThat(n.path("messaging_product").asText()).isEqualTo("whatsapp");
        assertThat(n.path("type").asText()).isEqualTo("template");
        assertThat(n.path("template").path("name").asText()).isEqualTo("hotclick_pago_confirmado_v1");
        assertThat(n.path("template").path("language").path("code").asText()).isEqualTo("es");
        JsonNode comp = n.path("template").path("components").get(0);
        assertThat(comp.path("type").asText()).isEqualTo("body");
        assertThat(comp.path("parameters")).hasSize(3);
        assertThat(comp.path("parameters").get(2).path("type").asText()).isEqualTo("text");
        assertThat(comp.path("parameters").get(2).path("text").asText()).isEqualTo("12.500");
    }

    @Test
    void jsonDeTextoLibre() {
        Map<String, Object> body = WhatsAppMetaApiClient.construirCuerpoTexto("506", "hola");
        assertThat(body.get("type")).isEqualTo("text");
    }
}
