package com.hotclick.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** C1 QA 2-nov-2026: en /api/admin/pagos el pedidoId salía null. */
@DisplayName("Admin pagos | el resumen trae el pedidoId sin exponer datos de más")
class PagoResumenDTOPedidoIdTest {

    @Test
    @DisplayName("Pago con pedido → pedidoId y numeroPedido en el JSON")
    void traePedidoId() throws Exception {
        Pedido pedido = new Pedido();
        pedido.setId(10L);
        pedido.setNumeroPedido("ORD-X");
        Pago pago = new Pago();
        pago.setPedido(pedido);
        pago.setEstadoPago("CAPTURADO");

        @SuppressWarnings("unchecked")
        Map<String, Object> json = new ObjectMapper().convertValue(PagoResumenDTO.from(pago), Map.class);

        assertThat(json.get("pedidoId")).isEqualTo(10L);
        assertThat(json.get("numeroPedido")).isEqualTo("ORD-X");
        // Solo se suma pedidoId: el resto del contrato queda igual (sin datos nuevos del pedido ni del comprador).
        assertThat(json.keySet()).containsExactlyInAnyOrder("id", "pedidoId", "numeroPedido", "proveedor", "estadoPago",
            "monto", "correoUsuario", "merchantToken", "fechaCreacion", "fechaActualizacion", "reembolsoError");
    }

    @Test
    @DisplayName("Pago sin pedido → pedidoId null, sin NPE")
    void sinPedido() {
        assertThat(PagoResumenDTO.from(new Pago()).getPedidoId()).isNull();
    }
}
