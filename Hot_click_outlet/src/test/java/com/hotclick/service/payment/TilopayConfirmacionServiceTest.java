package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.TilopayService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TilopayConfirmacionServiceTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private TilopayService tilopayService;
    @Mock private TilopayPaymentProviderAccess providerAccess;
    @Mock private PaymentService paymentService;

    @InjectMocks private TilopayConfirmacionService service;

    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void setUp() {
        pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-ABC");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);

        pago = new Pago();
        pago.setId(10L);
        pago.setPedido(pedido);
        pago.setMerchantToken("ORD-ABC");
        pago.setProveedor(Constants.PROVEEDOR_TILOPAY);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMonto(10000);
    }

    @Test
    void confirmar_aprobada() {
        when(pedidoRepository.findByNumeroPedido("ORD-ABC")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(1L)).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString()))
            .thenReturn(false);
        when(tilopayService.consultarTransaccion("ORD-ABC"))
            .thenReturn(new TilopayService.ConsultaResultado(true, "1", "ok", "AUTH"));
        when(paymentService.buildStatusResponse(pago)).thenReturn(new PaymentStatusResponse());

        service.confirmar("ORD-ABC", Map.of("code", "1"));

        assertEquals(Constants.PAGO_CAPTURADO, pago.getEstadoPago());
        verify(paymentService).confirmarPedido(pago);
        verify(paymentService, never()).marcarFallido(any(), any());
    }

    @Test
    void confirmar_rechazada() {
        when(pedidoRepository.findByNumeroPedido("ORD-ABC")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(1L)).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString()))
            .thenReturn(false);
        when(tilopayService.consultarTransaccion("ORD-ABC"))
            .thenReturn(new TilopayService.ConsultaResultado(false, "0", "declined", null));
        when(paymentService.buildStatusResponse(pago)).thenReturn(new PaymentStatusResponse());

        service.confirmar("ORD-ABC", Map.of("code", "0"));

        verify(paymentService).marcarFallido(eq(pago), anyString());
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    void confirmar_duplicadaYaCapturado() {
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        when(pedidoRepository.findByNumeroPedido("ORD-ABC")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(1L)).thenReturn(Optional.of(pago));
        when(paymentService.buildStatusResponse(pago)).thenReturn(new PaymentStatusResponse());

        service.confirmar("ORD-ABC", Map.of());

        verify(tilopayService, never()).consultarTransaccion(anyString());
        verify(paymentService, never()).confirmarPedido(any());
        verify(webhookEventRepository, never()).save(any());
    }
}
