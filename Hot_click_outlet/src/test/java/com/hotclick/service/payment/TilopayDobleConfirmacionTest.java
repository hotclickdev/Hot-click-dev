package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.CuponService;
import com.hotclick.service.EncargoService;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Carrera Tilopay: el retorno del navegador (/confirmar), el webhook y el cleanup de expirados
 * pueden confirmar el mismo pedido con una copia vieja (PENDIENTE) en memoria. Solo quien gana el
 * UPDATE condicional aplica los efectos: stock, billetera, correos y cupón, una sola vez.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TilopayDobleConfirmacionTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private CuponService cuponService;
    @Mock private GiftCardService giftCardService;
    @Mock private StockReservationService stockReservationService;
    @Mock private PaymentNotificationsFacade paymentNotificationsFacade;
    @Mock private PosQrVentaService posQrVentaService;
    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private EncargoService encargoService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private PaymentOrderConfirmationService confirmacion;
    @InjectMocks private PaymentFailureHandler fallo;

    private Pago pagoPendiente() {
        Pedido pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-1");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE); // copia vieja: en la BD ya puede estar PAGADO
        pedido.setCuponCodigo("HOLA10");
        pedido.setItems(new ArrayList<>());
        Pago pago = new Pago();
        pago.setId(10L);
        pago.setPedido(pedido);
        pago.setProveedor(Constants.PROVEEDOR_TILOPAY);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));
        return pago;
    }

    @Test
    void confirmacionPerdida_noRepiteStockBilleteraNiCorreos() {
        Pago pago = pagoPendiente();
        when(pedidoRepository.reclamarParaConfirmar(any(), any())).thenReturn(0); // el webhook ya ganó

        confirmacion.confirmarPedido(pago, this, eventPublisher);

        verify(stockReservationService, never()).confirmAndConsumeStock(any(), any(), any());
        verify(paymentNotificationsFacade, never()).onPedidoConfirmado(any(), any());
        verify(cuponService, never()).marcarUsado(anyString());
        verify(cuponService, never()).marcarUsado(anyString(), any());
    }

    @Test
    void confirmacionGanadora_aplicaLosEfectosUnaVez() {
        Pago pago = pagoPendiente();
        when(pedidoRepository.reclamarParaConfirmar(any(), any())).thenReturn(1);

        confirmacion.confirmarPedido(pago, this, eventPublisher);

        verify(stockReservationService, times(1)).confirmAndConsumeStock(any(), any(), any());
        verify(paymentNotificationsFacade, times(1)).onPedidoConfirmado(any(), eq(pago));
    }

    @Test
    void falloRepetido_noLiberaReservasNiReenviaCorreo() {
        Pago pago = pagoPendiente();
        when(pagoRepository.marcarFallidoSiPendiente(any(), any())).thenReturn(0); // otro hilo ya lo resolvió

        fallo.marcarFallido(pago, "Tarjeta rechazada");

        verify(stockReservationService, never()).liberarReservas(any());
        verify(paymentNotificationsFacade, never()).onPagoFallido(any(), any());
    }

    private static <T> T eq(T v) { return org.mockito.ArgumentMatchers.eq(v); }
}
