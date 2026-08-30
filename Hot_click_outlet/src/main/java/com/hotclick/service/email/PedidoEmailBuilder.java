package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PedidoEmailBuilder {

    @Autowired private PedidoClienteEmailBuilder clienteEmails;
    @Autowired private PedidoAdminEmailBuilder   adminEmails;

    public String buildConfirmacionPedido(Pedido pedido, Usuario cliente) {
        return clienteEmails.buildConfirmacionPedido(pedido, cliente);
    }

    public String buildNotificacionGuia(Pedido pedido, Usuario cliente) {
        return clienteEmails.buildNotificacionGuia(pedido, cliente);
    }

    public String buildSeguimientoEstado(Pedido pedido, Usuario cliente, String nota) {
        return clienteEmails.buildSeguimientoEstado(pedido, cliente, nota);
    }

    public String buildPagoFallido(Pedido pedido, Usuario cliente, String motivo) {
        return clienteEmails.buildPagoFallido(pedido, cliente, motivo);
    }

    public String buildRecuperacionCarrito(
            String tokenRecuperacion,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {
        return clienteEmails.buildRecuperacionCarrito(tokenRecuperacion, items, appUrl);
    }

    public String buildNuevoPedidoEmprendedor(Pedido pedido) {
        return adminEmails.buildNuevoPedidoEmprendedor(pedido);
    }

    public String buildNuevoPedidoAdminIT(Pedido pedido) {
        return adminEmails.buildNuevoPedidoAdminIT(pedido);
    }
}
