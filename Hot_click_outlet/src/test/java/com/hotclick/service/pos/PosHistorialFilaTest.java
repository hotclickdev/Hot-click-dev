package com.hotclick.service.pos;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NP-12 | historial del POS sin entidades LAZY")
class PosHistorialFilaTest {

    @Test
    void armaSoloLosCamposDelHistorial() {
        Producto prod = new Producto();
        prod.setNombreProducto("Pulsera");
        PedidoItem it = new PedidoItem();
        it.setProducto(prod);
        it.setCantidad(2);
        it.setSubtotalItem(3800);
        Pedido p = new Pedido();
        p.setId(28L);
        p.setNumeroPedido("POS-X");
        p.setMetodoPago("EFECTIVO");
        p.setTotalPedido(3800);
        p.setItems(List.of(it));

        Map<String, Object> fila = PosVentaService.aFilaHistorial(p);
        assertThat(fila).containsEntry("numeroPedido", "POS-X").containsEntry("totalPedido", 3800).containsEntry("usuarioFinal", null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) fila.get("items");
        assertThat(items).singleElement().satisfies(m -> {
            assertThat(m).containsEntry("cantidad", 2).containsEntry("subtotalItem", 3800);
            assertThat(m.get("producto")).isEqualTo(Map.of("nombreProducto", "Pulsera"));
        });
    }
}
