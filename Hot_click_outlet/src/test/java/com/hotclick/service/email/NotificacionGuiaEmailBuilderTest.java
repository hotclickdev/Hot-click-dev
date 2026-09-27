package com.hotclick.service.email;

import com.hotclick.model.Compra;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.WhatsAppService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Email de guía — «Paquete X de N» en compras multi-negocio")
class NotificacionGuiaEmailBuilderTest {

    private NotificacionGuiaEmailBuilder builder;
    private Usuario cliente;

    @BeforeEach
    void setUp() {
        builder = new NotificacionGuiaEmailBuilder();
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
        cliente = new Usuario();
        cliente.setNombre("Ana");
        cliente.setCorreo("ana@test.cr");
    }

    @Test
    @DisplayName("Compra de 3 paquetes → «ORD-10482 · Paquete 2 de 3» junto al número")
    void compraMultiPaquete_muestraPaqueteXdeN() {
        Pedido pedido = paquete("ORD-10482-2", 2, compra("ORD-10482", 3));

        String html = builder.buildNotificacionGuia(pedido, cliente);

        assertThat(html).contains("ORD-10482 · Paquete 2 de 3");
    }

    @Test
    @DisplayName("Compra de un solo paquete → solo el número del pedido, sin «Paquete»")
    void compraDeUnPaquete_noMuestraPaquete() {
        Pedido pedido = paquete("ORD-500", 1, compra("ORD-500", 1));

        String html = builder.buildNotificacionGuia(pedido, cliente);

        assertThat(html).contains("ORD-500").doesNotContain("Paquete 1 de 1");
    }

    @Test
    @DisplayName("Pedido previo a V142 (sin compra) → número del pedido tal cual")
    void pedidoSinCompra_usaNumeroPedido() {
        Pedido pedido = paquete("ORD-VIEJO", null, null);

        assertThat(NotificacionGuiaEmailBuilder.numeroConPaquete(pedido)).isEqualTo("ORD-VIEJO");
    }

    @Test
    @DisplayName("El asunto del correo también lleva «Paquete X de N»")
    void asunto_llevaPaqueteXdeN() {
        ResendEmailService resend = mock(ResendEmailService.class);
        PedidoEmailBuilder pedidoEmailBuilder = mock(PedidoEmailBuilder.class);
        NotificacionPedidoEmailSender sender = new NotificacionPedidoEmailSender();
        ReflectionTestUtils.setField(sender, "resendEmailService", resend);
        ReflectionTestUtils.setField(sender, "whatsAppService", mock(WhatsAppService.class));
        ReflectionTestUtils.setField(sender, "pedidoEmailBuilder", pedidoEmailBuilder);
        Pedido pedido = paquete("ORD-10482", 1, compra("ORD-10482", 3));
        pedido.setUsuarioFinal(cliente);
        when(pedidoEmailBuilder.buildNotificacionGuia(pedido, cliente)).thenReturn("<html></html>");

        sender.enviarNotificacionGuia(pedido);

        verify(resend).send(eq("ana@test.cr"), eq("Tu pedido va en camino — ORD-10482 · Paquete 1 de 3"), anyString());
    }

    private static Compra compra(String numero, int paquetes) {
        Compra compra = new Compra();
        compra.setNumeroCompra(numero);
        compra.setCantidadPaquetes(paquetes);
        return compra;
    }

    private static Pedido paquete(String numeroPedido, Integer numeroPaquete, Compra compra) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(numeroPedido);
        pedido.setNumeroPaquete(numeroPaquete);
        pedido.setCompra(compra);
        pedido.setNumeroGuia("RR123456789CR");
        return pedido;
    }
}
