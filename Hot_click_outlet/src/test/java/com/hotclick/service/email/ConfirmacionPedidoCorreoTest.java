package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.WhatsAppService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** MAN-6: al confirmarse el pago (pasarela → onPedidoConfirmado → avisarVentaConfirmada) sale el correo al comprador. */
@ExtendWith(MockitoExtension.class)
@DisplayName("MAN-6 | correo de confirmación del pedido")
class ConfirmacionPedidoCorreoTest {

    @Mock ResendEmailService resendEmailService;
    @Mock WhatsAppService whatsAppService;
    @Mock PedidoEmailBuilder pedidoEmailBuilder;
    @InjectMocks NotificacionPedidoEmailSender sender;

    private Pedido pedido(String correo) {
        Usuario u = new Usuario();
        u.setCorreo(correo);
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-T1");
        p.setUsuarioFinal(u);
        return p;
    }

    @Test
    @DisplayName("comprador (invitado o con cuenta) recibe el correo de confirmación")
    void comprador() {
        lenient().when(pedidoEmailBuilder.asuntoConfirmacion(any())).thenReturn("asunto");
        lenient().when(pedidoEmailBuilder.buildConfirmacionPedido(any(), any())).thenReturn("<p>ok</p>");
        sender.enviarConfirmacionPedido(pedido("compradora@test.cr"), null, null);
        verify(resendEmailService).send(eq("compradora@test.cr"), eq("asunto"), eq("<p>ok</p>"));
    }

    @Test
    @DisplayName("venta POS al Cliente Mostrador: no se envía a la casilla interna")
    void mostrador() {
        sender.enviarConfirmacionPedido(pedido("mostrador@hotclick.internal"), null, null);
        verify(resendEmailService, never()).send(eq("mostrador@hotclick.internal"), anyString(), anyString());
    }
}
