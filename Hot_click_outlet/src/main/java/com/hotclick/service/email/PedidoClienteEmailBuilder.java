package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Fachada de templates de email transaccional al cliente (pedidos y carrito).
 * Extraído bit-idéntico de PedidoEmailBuilder — no cambia comportamiento.
 */
@Component
class PedidoClienteEmailBuilder {

    @Autowired private ConfirmacionPedidoEmailBuilder confirmacion;
    @Autowired private NotificacionGuiaEmailBuilder   guia;
    @Autowired private SeguimientoEstadoEmailBuilder  seguimiento;
    @Autowired private PagoFallidoEmailBuilder        pagoFallido;
    @Autowired private RecuperacionCarritoEmailBuilder carrito;

    String buildConfirmacionPedido(Pedido pedido, Usuario cliente) {
        return confirmacion.buildConfirmacionPedido(pedido, cliente);
    }

    String buildNotificacionGuia(Pedido pedido, Usuario cliente) {
        return guia.buildNotificacionGuia(pedido, cliente);
    }

    String buildSeguimientoEstado(Pedido pedido, Usuario cliente, String nota) {
        return seguimiento.buildSeguimientoEstado(pedido, cliente, nota);
    }

    String buildPagoFallido(Pedido pedido, Usuario cliente, String motivo) {
        return pagoFallido.buildPagoFallido(pedido, cliente, motivo);
    }

    String buildRecuperacionCarrito(
            Long carritoId,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {
        return carrito.buildRecuperacionCarrito(carritoId, items, appUrl);
    }
}
