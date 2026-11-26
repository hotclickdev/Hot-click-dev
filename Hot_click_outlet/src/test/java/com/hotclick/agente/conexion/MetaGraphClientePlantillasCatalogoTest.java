package com.hotclick.agente.conexion;

import com.hotclick.exception.IntegracionExternaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Contrato con Graph API de plantillas de marketing y del catálogo (items_batch): sin Meta real. */
class MetaGraphClientePlantillasCatalogoTest {

    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.createServer(http);
    private final MetaGraphCliente graph = new MetaGraphCliente(new MetaConexionConfig("app", "sec", "s", "l", "v23.0"), http);
    private static final String BASE = "https://graph.facebook.com/v23.0/";

    @Test
    @DisplayName("crear plantilla: POST /{waba}/message_templates con el token de la cuenta y el JSON de MARKETING")
    void crearPlantilla() {
        server.expect(requestTo(BASE + "WABA9/message_templates")).andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer tok-x"))
            .andExpect(jsonPath("$.category").value("MARKETING"))
            .andExpect(jsonPath("$.components[0].type").value("BODY"))
            .andRespond(withSuccess("{\"id\":\"1259\",\"status\":\"PENDING\",\"category\":\"MARKETING\"}",
                MediaType.APPLICATION_JSON));

        MetaGraphCliente.PlantillaRemota r = graph.crearPlantilla("WABA9", "tok-x",
            Map.of("name", "n", "category", "MARKETING", "language", "es", "components", List.of(Map.of("type", "BODY"))));

        assertThat(r.id()).isEqualTo("1259");
        assertThat(r.estado()).isEqualTo("PENDING");
        server.verify();
    }

    @Test
    @DisplayName("consultar estado: GET /{id}?fields=status,rejected_reason")
    void estadoPlantilla() {
        server.expect(requestTo(BASE + "1259?fields=status,rejected_reason")).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("{\"status\":\"REJECTED\",\"rejected_reason\":\"INVALID_FORMAT\",\"id\":\"1259\"}",
                MediaType.APPLICATION_JSON));

        MetaGraphCliente.PlantillaRemota r = graph.estadoPlantilla("1259", "tok-x");

        assertThat(r.estado()).isEqualTo("REJECTED");
        assertThat(r.motivo()).isEqualTo("INVALID_FORMAT");
    }

    @Test
    @DisplayName("items_batch: item_type PRODUCT_ITEM, allow_upsert y requests como JSON; recoge los productos con error")
    void itemsBatch() {
        server.expect(requestTo(BASE + "CAT1/items_batch")).andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer tok-x"))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("item_type=PRODUCT_ITEM")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("allow_upsert=true")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("requests=")))
            .andRespond(withSuccess("{\"handles\":[\"h1\"],\"validation_status\":[{\"retailer_id\":\"7\","
                + "\"errors\":[{\"message\":\"x\"}],\"warnings\":[]},{\"retailer_id\":\"8\",\"errors\":[],\"warnings\":[]}]}",
                MediaType.APPLICATION_JSON));

        MetaGraphCliente.ResultadoLote r = graph.itemsBatch("CAT1", "tok-x",
            List.of(Map.of("method", "UPDATE", "data", Map.of("id", "7")), Map.of("method", "DELETE", "data", Map.of("id", "8"))));

        assertThat(r.conError()).containsExactly("7");
        server.verify();
    }

    @Test
    @DisplayName("un 4xx (permiso catalog_management faltante) es MetaRechazoException; un 5xx, IntegracionExternaException")
    void errores() {
        server.expect(requestTo(BASE + "CAT1?fields=name")).andRespond(withStatus(HttpStatus.FORBIDDEN)
            .contentType(MediaType.APPLICATION_JSON).body("{\"error\":{\"code\":200,\"message\":\"permissions\"}}"));
        assertThatThrownBy(() -> graph.nombreCatalogo("CAT1", "t"))
            .isInstanceOfSatisfying(MetaRechazoException.class, e -> assertThat(e.codigoMeta()).isEqualTo(200));

        MockRestServiceServer s2 = MockRestServiceServer.createServer(http);
        s2.expect(requestTo(BASE + "CAT1?fields=name")).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        assertThatThrownBy(() -> graph.nombreCatalogo("CAT1", "t")).isInstanceOf(IntegracionExternaException.class);
    }

    @Test
    @DisplayName("id del producto en Meta por retailer id: solo dígitos (sin inyección en el filtro)")
    void productoMetaId() {
        server.expect(requestTo(BASE + "CAT1/products?fields=id&filter=%7B%22retailer_id%22:%7B%22eq%22:%2242%22%7D%7D"))
            .andRespond(withSuccess("{\"data\":[{\"id\":\"FB-1\"}]}", MediaType.APPLICATION_JSON));

        assertThat(graph.productoMetaId("CAT1", "t", "42")).isEqualTo("FB-1");
        assertThat(graph.productoMetaId("CAT1", "t", "42\"}} OR x")).isNull();
        server.verify();
    }
}
