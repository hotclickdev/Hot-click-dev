package com.hotclick.service;

import com.hotclick.model.Pedido;
import com.hotclick.service.email.NotificacionNegocioEmailSender;
import com.hotclick.service.email.NotificacionPedidoEmailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** BAJO: los pedidos es_prueba no mandan correos; los reales siguen igual. */
class NotificacionEmailPedidoPruebaTest {

    private NotificacionEmailService svc;
    private NotificacionPedidoEmailSender sender;

    @BeforeEach
    void setUp() {
        svc = new NotificacionEmailService();
        sender = mock(NotificacionPedidoEmailSender.class);
        ReflectionTestUtils.setField(svc, "pedidoEmailSender", sender);
        ReflectionTestUtils.setField(svc, "negocioEmailSender", mock(NotificacionNegocioEmailSender.class));
    }

    private Pedido pedido(boolean prueba) {
        Pedido p = new Pedido();
        p.setId(5L);
        p.setEsPrueba(prueba);
        return p;
    }

    @Test
    @DisplayName("pedido de prueba: ningún correo de pedido sale")
    void pedidoDePruebaNoMandaCorreos() {
        Pedido p = pedido(true);
        svc.enviarConfirmacionPedido(p);
        svc.enviarPedidoRecibido(p);
        svc.enviarNotificacionGuia(p);
        svc.enviarSeguimientoEstado(p);
        svc.enviarSeguimientoEstado(p, "nota");
        svc.enviarSeguimientoEstadoSync(p, "nota");
        svc.enviarPagoFallido(p, "motivo");
        svc.enviarNuevoPedidoAEmprendedor(p);
        svc.enviarNuevoPedidoAAdminIT(p, "admin@example.invalid");
        verifyNoInteractions(sender);
    }

    @Test
    @DisplayName("pedido real: la confirmación se sigue mandando")
    void pedidoRealSiManda() {
        Pedido p = pedido(false);
        svc.enviarConfirmacionPedido(p);
        verify(sender).enviarConfirmacionPedido(eq(p), any(), any());
    }
}
