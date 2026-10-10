package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.service.WebhookDispatcherService;
import com.hotclick.service.analytics.Ga4MeasurementProtocolService;
import com.hotclick.service.analytics.PostHogCaptureService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Los avisos de un pedido pagado (correo/WhatsApp vía VentaAviso, n8n, webhook de plugins,
 * PostHog y GA4) salen solo si la transacción del cobro hace commit. La billetera se sigue
 * acreditando dentro de la transacción (QA-B02-5).
 */
class PedidoConfirmadoAfterCommitTest {

    private final NotificacionEmailService email = mock(NotificacionEmailService.class);
    private final VentaAvisoService ventaAviso = mock(VentaAvisoService.class);
    private final N8nWebhookService n8n = mock(N8nWebhookService.class);
    private final WebhookDispatcherService plugins = mock(WebhookDispatcherService.class);
    private final AggregatorService aggregator = mock(AggregatorService.class);
    private final PostHogCaptureService posthog = mock(PostHogCaptureService.class);
    private final Ga4MeasurementProtocolService ga4 = mock(Ga4MeasurementProtocolService.class);
    private EmbeddedDatabase db;
    private PaymentNotificationsFacade facade;
    private TransactionTemplate tx;
    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void setUp() {
        db = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        tx = new TransactionTemplate(new DataSourceTransactionManager(db));
        facade = new PaymentNotificationsFacade();
        ReflectionTestUtils.setField(facade, "notificacionEmailService", email);
        ReflectionTestUtils.setField(facade, "ventaAvisoService", ventaAviso);
        ReflectionTestUtils.setField(facade, "n8nWebhookService", n8n);
        ReflectionTestUtils.setField(facade, "webhookDispatcher", plugins);
        ReflectionTestUtils.setField(facade, "aggregatorService", aggregator);
        ReflectionTestUtils.setField(facade, "postHogCaptureService", posthog);
        ReflectionTestUtils.setField(facade, "ga4MeasurementProtocolService", ga4);
        pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-1");
        pedido.setTotalPedido(1000);
        pago = new Pago();
        pago.setProveedor("TILOPAY");
    }

    @AfterEach
    void tearDown() { db.shutdown(); }

    @Test
    void rollback_noSaleNingunAviso_peroLaBilleteraSeAcreditaEnLaTx() {
        tx.executeWithoutResult(s -> {
            facade.onPedidoConfirmado(pedido, pago);
            verify(aggregator).acreditarVentaEnTransaccion(pedido);
            s.setRollbackOnly();
        });
        verifyNoInteractions(ventaAviso, n8n,
            plugins, posthog,
            ga4);
    }

    @Test
    void dentroDeLaTx_nadaSaleAntesDelCommit() {
        tx.executeWithoutResult(s -> {
            facade.onPedidoConfirmado(pedido, pago);
            verifyNoInteractions(ventaAviso, n8n,
                plugins, posthog);
        });
    }

    @Test
    void commit_cadaAvisoSaleUnaVez() {
        tx.executeWithoutResult(s -> facade.onPedidoConfirmado(pedido, pago));
        verify(ventaAviso, times(1)).avisarVentaConfirmada(pedido);
        verify(n8n, times(1)).notificarPedidoNuevo(pedido);
        verify(plugins, times(1)).dispatch(any(), eq("pedido.pagado"), anyMap());
        verify(posthog, times(1)).capturarPedidoPagado(pedido, pago);
        verify(ga4, times(1)).enviarPurchase(pedido);
        verify(aggregator, times(1)).acreditarVentaEnTransaccion(pedido);
    }
}
