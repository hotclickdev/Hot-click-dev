package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.WebhookDispatcherService;
import com.hotclick.service.analytics.PostHogCaptureService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentNotificationsFacade — PostHog pedido_pagado")
class PaymentNotificationsFacadeTest {

    @Mock NotificacionEmailService notificacionEmailService;
    @Mock N8nWebhookService n8nWebhookService;
    @Mock WebhookDispatcherService webhookDispatcher;
    @Mock AggregatorService aggregatorService;
    @Mock PostHogCaptureService postHogCaptureService;

    @InjectMocks PaymentNotificationsFacade facade;

    @Test
    @DisplayName("pedido confirmado captura pedido_pagado")
    void confirmadoCapturaPostHog() {
        Pedido pedido = pedidoPagado();
        Pago pago = pagoStripe();

        facade.onPedidoConfirmado(pedido, pago);

        verify(postHogCaptureService).capturarPedidoPagado(pedido, pago);
        verify(notificacionEmailService).enviarConfirmacionPedido(pedido);
    }

    @Test
    @DisplayName("pago 100% gift card captura pedido_pagado")
    void giftCardCompletaCapturaPostHog() {
        Pedido pedido = pedidoPagado();

        facade.onGiftCardFullPayment(pedido, "GC-TEST");

        verify(postHogCaptureService).capturarPedidoPagado(eq(pedido), isNull());
        verify(notificacionEmailService).enviarConfirmacionPedido(pedido);
    }

    @Test
    @DisplayName("pago fallido no captura pedido_pagado")
    void fallidoNoCapturaPostHog() {
        Pedido pedido = pedidoPagado();

        facade.onPagoFallido(pedido, "tarjeta rechazada");

        verify(postHogCaptureService, never()).capturarPedidoPagado(any(), any());
        verify(notificacionEmailService).enviarPagoFallido(pedido, "tarjeta rechazada");
    }

    @Test
    @DisplayName("PostHog ausente no lanza al confirmar")
    void postHogNullNoNpe() {
        ReflectionTestUtils.setField(facade, "postHogCaptureService", null);
        Pedido pedido = pedidoPagado();

        facade.onPedidoConfirmado(pedido, pagoStripe());
        facade.onGiftCardFullPayment(pedido, "GC-TEST");

        verify(notificacionEmailService, times(2)).enviarConfirmacionPedido(pedido);
    }

    private static Pedido pedidoPagado() {
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-PH-1");
        p.setTotalPedido(12000);
        p.setMetodoEnvio("DOMICILIO");
        p.setEmpresa(empresa);
        return p;
    }

    private static Pago pagoStripe() {
        Pago pago = new Pago();
        pago.setProveedor("STRIPE");
        return pago;
    }
}
