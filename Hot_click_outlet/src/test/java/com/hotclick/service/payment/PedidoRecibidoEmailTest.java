package com.hotclick.service.payment;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.service.WebhookDispatcherService;
import com.hotclick.service.email.NotificacionPedidoEmailSender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("MAN-6 | «Recibimos tu pedido» sale al crear el pedido, después del commit")
@ExtendWith(MockitoExtension.class)
class PedidoRecibidoEmailTest {

    @Mock NotificacionEmailService notificacionEmailService;
    @Mock VentaAvisoService ventaAvisoService;
    @Mock N8nWebhookService n8nWebhookService;
    @Mock WebhookDispatcherService webhookDispatcher;
    @Mock AggregatorService aggregatorService;
    @InjectMocks PaymentNotificationsFacade facade;

    private static Pedido pedido(String correo) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-TEST-1");
        p.setTotalPedido(15000);
        Usuario u = new Usuario();
        u.setNombre("Ana");
        u.setCorreo(correo);
        p.setUsuarioFinal(u);
        return p;
    }

    @Test
    void sinTransaccionSaleEnElMomento() {
        Pedido p = pedido("ana@test.cr");
        facade.onPedidoCreado(p, "ONVO");
        verify(notificacionEmailService).enviarPedidoRecibido(p);
    }

    @Test
    void conTransaccionEsperaAlCommit() {
        Pedido p = pedido("ana@test.cr");
        TransactionSynchronizationManager.initSynchronization();
        try {
            facade.onPedidoCreado(p, "ONVO");
            verify(notificacionEmailService, never()).enviarPedidoRecibido(p);
            for (TransactionSynchronization s : TransactionSynchronizationManager.getSynchronizations()) s.afterCommit();
            verify(notificacionEmailService).enviarPedidoRecibido(p);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void elSenderLlamaASendGridYNoRevientaSiFalla() {
        NotificacionPedidoEmailSender sender = new NotificacionPedidoEmailSender();
        ResendEmailService sg = mock(ResendEmailService.class);
        ReflectionTestUtils.setField(sender, "resendEmailService", sg);
        sender.enviarPedidoRecibido(pedido("ana@test.cr"));
        verify(sg).send(eq("ana@test.cr"), contains("ORD-TEST-1"), contains("₡15.000"));

        doThrow(new RuntimeException("caído")).when(sg).send(anyString(), anyString(), anyString());
        sender.enviarPedidoRecibido(pedido("ana@test.cr")); // se loguea, no tira
    }

    @Test
    void mostradorInternoNoRecibe() {
        NotificacionPedidoEmailSender sender = new NotificacionPedidoEmailSender();
        ResendEmailService sg = mock(ResendEmailService.class);
        ReflectionTestUtils.setField(sender, "resendEmailService", sg);
        sender.enviarPedidoRecibido(pedido("mostrador@hotclick.internal"));
        verify(sg, never()).send(anyString(), anyString(), anyString());
    }
}
