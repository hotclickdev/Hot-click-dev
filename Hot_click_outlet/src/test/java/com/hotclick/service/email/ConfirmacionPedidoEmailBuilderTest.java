package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ConfirmacionPedidoEmailBuilder — correo de confirmación (Figma: Correo · Confirmación de pedido)")
class ConfirmacionPedidoEmailBuilderTest {

    private final ConfirmacionPedidoEmailBuilder builder = new ConfirmacionPedidoEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    private Pedido pedidoConItem(String nombreProducto, String nombreCliente) {
        Producto producto = new Producto();
        producto.setNombreProducto(nombreProducto);

        PedidoItem item = new PedidoItem();
        item.setProducto(producto);
        item.setCantidad(1);
        item.setSubtotalItem(11900);

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-10482");
        pedido.setSubtotal(11900);
        pedido.setCostoEnvio(4000);
        pedido.setTotalPedido(15900);
        pedido.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        pedido.setItems(new ArrayList<>(List.of(item)));

        Usuario cliente = new Usuario();
        cliente.setNombre(nombreCliente);
        pedido.setUsuarioFinal(cliente);
        return pedido;
    }

    @Test
    @DisplayName("Incluye número de pedido, productos y total")
    void incluyeDatosClave() {
        Pedido pedido = pedidoConItem("Auriculares over-ear", "Andrea");
        String html = builder.buildConfirmacionPedido(pedido, pedido.getUsuarioFinal());

        assertThat(html)
            .contains("ORD-10482")
            .contains("Auriculares over-ear")
            .contains("Andrea")
            .contains("₡" + EmailLayoutHelper.CRC.format(15900))
            .contains("Envío a domicilio");
    }

    @Test
    @DisplayName("Escapa nombre de producto y de cliente con HTML/scripts")
    void escapaDatosDeUsuario() {
        Pedido pedido = pedidoConItem("<img src=x onerror=alert(1)>", "<script>alert(1)</script>");
        String html = builder.buildConfirmacionPedido(pedido, pedido.getUsuarioFinal());

        assertThat(html)
            .doesNotContain("<script>alert(1)</script>")
            .doesNotContain("<img src=x onerror=alert(1)>")
            .contains("&lt;script&gt;")
            .contains("&lt;img");
    }
}
