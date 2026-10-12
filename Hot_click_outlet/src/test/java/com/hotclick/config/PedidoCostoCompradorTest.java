package com.hotclick.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** P7-01: el comprador recibe su pedido sin costo ni margen del vendedor; dueño/ADMIN los ven. */
class PedidoCostoCompradorTest {

    private static JsonNode serializar(boolean puedeVer) throws Exception {
        Pedido p = new Pedido();
        p.setNumeroPedido("P701");
        p.setTotalPedido(10_000);
        p.setCostoTotalProductos(4_000);
        p.setUtilidadBruta(6_000);
        PedidoItem it = new PedidoItem();
        it.setPedido(p);
        it.setCostoUnitarioMomento(4_000);
        it.setUtilidadItem(6_000);
        p.setItems(new ArrayList<>(List.of(it)));
        SimpleModule m = new SimpleModule("p701");
        m.setSerializerModifier(new CamposInternosSerializerModifier(id -> puedeVer));
        JsonMapper mapper = JsonMapper.builder().addModule(new JavaTimeModule()).addModule(m)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS).build();
        return mapper.readTree(mapper.writeValueAsString(p));
    }

    @Test
    void compradorNoVeCostoNiMargen() throws Exception {
        JsonNode json = serializar(false);
        assertThat(json.has("costoTotalProductos")).isFalse();
        assertThat(json.has("utilidadBruta")).isFalse();
        assertThat(json.get("items").get(0).has("costoUnitarioMomento")).isFalse();
        assertThat(json.get("items").get(0).has("utilidadItem")).isFalse();
        assertThat(json.get("totalPedido").asInt()).isEqualTo(10_000);
    }

    @Test
    void duenoLosVe() throws Exception {
        JsonNode json = serializar(true);
        assertThat(json.get("utilidadBruta").asInt()).isEqualTo(6_000);
        assertThat(json.get("items").get(0).get("costoUnitarioMomento").asInt()).isEqualTo(4_000);
    }
}
