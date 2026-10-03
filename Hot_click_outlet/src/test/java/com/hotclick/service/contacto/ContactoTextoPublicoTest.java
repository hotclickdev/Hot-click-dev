package com.hotclick.service.contacto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[NEGOCIO] Chat público: fichas de producto con contacto oculto según plan_empresa")
class ContactoTextoPublicoTest {

    @ParameterizedTest(name = "plan {0} → contacto visible={1}")
    @CsvSource({"EMPRENDEDOR, false", "GRATUITO, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void filasProducto_segunPlan(String plan, boolean conContacto) {
        Map<String, Object> fila = fila(plan);

        ContactoTextoPublico.ocultarFilasProducto(List.of(fila));

        assertThat(fila.get("descripcion_corta")).isEqualTo(conContacto
            ? "Sofá 200x90 cm a ₡17.500, pedidos 8888-8888"
            : "Sofá 200x90 cm a ₡17.500, pedidos [contacto oculto]");
        assertThat(fila.get("como_usar")).isEqualTo(conContacto ? "Ver tiktok.com/@casaluna" : "Ver [contacto oculto]");
        assertThat(fila.get("precio_venta")).isEqualTo(17500);
    }

    @Test
    @DisplayName("Sin columna plan_empresa: se enmascara (denegar por defecto)")
    void sinPlan_seEnmascara() {
        Map<String, Object> fila = fila(null);
        fila.remove("plan_empresa");
        ContactoTextoPublico.ocultarFilasProducto(List.of(fila));
        assertThat(fila.get("descripcion_corta")).isEqualTo("Sofá 200x90 cm a ₡17.500, pedidos [contacto oculto]");
    }

    private static Map<String, Object> fila(String plan) {
        Map<String, Object> f = new HashMap<>();
        f.put("plan_empresa", plan);
        f.put("nombre_producto", "Sofá Luna");
        f.put("descripcion_corta", "Sofá 200x90 cm a ₡17.500, pedidos 8888-8888");
        f.put("como_usar", "Ver tiktok.com/@casaluna");
        f.put("precio_venta", 17500);
        return f;
    }
}
