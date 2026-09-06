package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.service.WebhookDispatcherService;
import com.hotclick.service.analytics.PostHogCaptureService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PaymentNotificationsFacade {

    private static final Logger log = LoggerFactory.getLogger(PaymentNotificationsFacade.class);

    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private VentaAvisoService        ventaAvisoService;
    @Autowired private N8nWebhookService        n8nWebhookService;
    @Autowired private WebhookDispatcherService webhookDispatcher;
    @Autowired private AggregatorService        aggregatorService;
    @Autowired(required = false) private PostHogCaptureService postHogCaptureService;

    public void onPedidoCreado(Pedido pedido, String provider) {
        webhookDispatcher.dispatch(pedido.getEmpresaId(), "pedido.creado", Map.of(
            "numeroPedido", pedido.getNumeroPedido(),
            "total",        pedido.getTotalPedido(),
            "metodoPago",   provider,
            "metodoEnvio",  pedido.getMetodoEnvio()
        ));
    }

    public void onGiftCardFullPayment(Pedido pedido, String gcCodigo) {
        ventaAvisoService.avisarVentaConfirmada(pedido);
        n8nWebhookService.notificarPedidoNuevo(pedido);
        capturarPedidoPagado(pedido, null);
        log.info("Pedido {} pagado 100% con gift card {}", pedido.getNumeroPedido(), gcCodigo);
    }

    public void onPedidoConfirmado(Pedido pedido, Pago pago) {
        touchUsuarioFinalForAsync(pedido);
        ventaAvisoService.avisarVentaConfirmada(pedido);
        n8nWebhookService.notificarPedidoNuevo(pedido);
        webhookDispatcher.dispatch(pedido.getEmpresaId(), "pedido.pagado", Map.of(
            "numeroPedido", pedido.getNumeroPedido(),
            "total",        pedido.getTotalPedido(),
            "proveedor",    pago.getProveedor()
        ));
        // Acreditar wallet del emprendedor (async, fuera de esta TX)
        aggregatorService.acreditarVentaAsync(pedido);
        capturarPedidoPagado(pedido, pago);
        log.info("Pedido {} confirmado PAGADO via {}", pedido.getNumeroPedido(), pago.getProveedor());
    }

    private void capturarPedidoPagado(Pedido pedido, Pago pago) {
        if (postHogCaptureService == null) return;
        postHogCaptureService.capturarPedidoPagado(pedido, pago);
    }

    public void onPagoFallido(Pedido pedido, String motivo) {
        touchUsuarioFinalForAsync(pedido);
        notificacionEmailService.enviarPagoFallido(pedido, motivo);
    }

    /**
     * Inicializar proxy LAZY de usuarioFinal dentro de la TX para que el @Async
     * thread no encuentre el proxy sin sesión → LazyInitializationException.
     */
    public void touchUsuarioFinalForAsync(Pedido pedido) {
        if (pedido.getUsuarioFinal() != null) {
            pedido.getUsuarioFinal().getCorreo(); // touch dentro de la transacción
        }
    }
}
