package com.hotclick.service.payment;

import com.hotclick.model.Compra;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
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
import static org.mockito.Mockito.*;

/** El tiquete de compra (D-105) depende de que la confirmación del pago publique CompraPagadaEvent. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CompraPagadaEventTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private CuponService cuponService;
    @Mock private GiftCardService giftCardService;
    @Mock private StockReservationService stockReservationService;
    @Mock private PaymentNotificationsFacade paymentNotificationsFacade;
    @Mock private PosQrVentaService posQrVentaService;
    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private EncargoService encargoService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private PaymentOrderConfirmationService service;

    private Pago pagoDeCompra(String estado, Pedido... grupo) {
        Pago pago = new Pago();
        pago.setId(10L);
        pago.setPedido(grupo[0]);
        when(pedidoGrupoService.delGrupo(grupo[0])).thenReturn(List.of(grupo));
        for (Pedido p : grupo) p.setEstadoPedido(estado);
        return pago;
    }

    private Pedido paquete(long id, Compra compra) {
        Pedido p = new Pedido();
        p.setId(id);
        p.setCompra(compra);
        p.setItems(new ArrayList<>());
        return p;
    }

    @Test
    void confirmarCompra_publicaCompraPagadaUnaSolaVez() {
        Compra compra = new Compra();
        compra.setId(55L);
        Pago pago = pagoDeCompra(Constants.PEDIDO_PENDIENTE, paquete(1L, compra), paquete(2L, compra));

        service.confirmarPedido(pago, this, eventPublisher);

        verify(eventPublisher, times(1)).publishEvent(new CompraPagadaEvent(55L));
    }

    @Test
    void pedidoSinCompra_noPublica() {
        Pago pago = pagoDeCompra(Constants.PEDIDO_PENDIENTE, paquete(1L, null));

        service.confirmarPedido(pago, this, eventPublisher);

        verify(eventPublisher, never()).publishEvent(any(CompraPagadaEvent.class));
    }

    @Test
    void confirmacionRepetida_noPublicaOtraVez() {
        Compra compra = new Compra();
        compra.setId(55L);
        Pago pago = pagoDeCompra(Constants.PEDIDO_PAGADO, paquete(1L, compra));

        service.confirmarPedido(pago, this, eventPublisher);

        verify(eventPublisher, never()).publishEvent(any(CompraPagadaEvent.class));
    }
}
