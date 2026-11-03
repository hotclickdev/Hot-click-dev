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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * LOW de Seguridad sobre #458: un webhook (o retorno/cleanup) que llega tarde, después de que el ADMIN canceló el
 * grupo en revisión por sobreventa, no lo revive ni lo pasa a PAGADO. El UPDATE condicional se simula como la BD:
 * gana solo si el estado actual no está en el conjunto excluido.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook tardío sobre un grupo CANCELADO no lo revive")
class WebhookTardioGrupoCanceladoTest {

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

    private static Pedido pedido(long id, String estado) {
        Pedido p = new Pedido();
        p.setId(id);
        p.setNumeroPedido("ORD-" + id);
        p.setEstadoPedido(estado);
        p.setItems(new ArrayList<>());
        return p;
    }

    /** Como la BD: UPDATE ... WHERE estado NOT IN :excluidos. */
    private void updateCondicionalComoBd(Pedido... pedidos) {
        when(pedidoRepository.reclamarParaConfirmar(anyLong(), any())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            Collection<String> excluidos = inv.getArgument(1);
            for (Pedido p : pedidos) {
                if (p.getId().equals(id)) {
                    if (excluidos.contains(p.getEstadoPedido())) return 0;
                    p.setEstadoPedido(Constants.PEDIDO_PAGADO);
                    return 1;
                }
            }
            return 0;
        });
    }

    private Pago pagoDe(Pedido principal, List<Pedido> grupo) {
        Pago pago = new Pago();
        pago.setId(10L);
        pago.setPedido(principal);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        when(pedidoGrupoService.delGrupo(principal)).thenReturn(grupo);
        return pago;
    }

    @Test
    @DisplayName("grupo entero CANCELADO por el ADMIN: sigue CANCELADO, sin stock, correos ni PAGADO")
    void grupoCancelado_noRevive() {
        Pedido a = pedido(1L, Constants.PEDIDO_CANCELADO);
        Pedido b = pedido(2L, Constants.PEDIDO_CANCELADO);
        updateCondicionalComoBd(a, b);
        Pago pago = pagoDe(a, List.of(a, b));

        PaymentOrderConfirmationService.Resultado r = confirmacion.confirmarPedido(pago, this, eventPublisher);

        assertThat(r).isNotEqualTo(PaymentOrderConfirmationService.Resultado.CONFIRMADO);
        assertThat(a.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(b.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(stockReservationService, never()).confirmAndConsumeStock(any(), any(), any());
        verify(paymentNotificationsFacade, never()).onPedidoConfirmado(any(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("hermano CANCELADO en un grupo vivo: solo se confirma el pendiente")
    void hermanoCancelado_noSeConfirma() {
        Pedido vivo = pedido(1L, Constants.PEDIDO_PENDIENTE);
        Pedido cancelado = pedido(2L, Constants.PEDIDO_CANCELADO);
        updateCondicionalComoBd(vivo, cancelado);
        Pago pago = pagoDe(vivo, List.of(vivo, cancelado));

        confirmacion.confirmarPedido(pago, this, eventPublisher);

        assertThat(vivo.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(cancelado.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(stockReservationService, never()).confirmAndConsumeStock(eq(cancelado), any(), any());
    }

    @Test
    @DisplayName("el UPDATE condicional excluye CANCELADO y REVISION_SOBREVENTA (carrera con la cancelación)")
    void updateExcluyeCanceladoYRevision() {
        Pedido vivo = pedido(1L, Constants.PEDIDO_PENDIENTE);
        updateCondicionalComoBd(vivo);
        Pago pago = pagoDe(vivo, List.of(vivo));
        // Entre la lectura y el UPDATE, el ADMIN cancela el pedido.
        vivo.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        when(pedidoGrupoService.delGrupo(vivo)).thenAnswer(inv -> List.of(vivo));
        org.mockito.Mockito.doAnswer(inv -> { vivo.setEstadoPedido(Constants.PEDIDO_CANCELADO); return List.of(); })
            .when(stockReservationService).productosSinStock(any());

        confirmacion.confirmarPedido(pago, this, eventPublisher);

        assertThat(vivo.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(paymentNotificationsFacade, never()).onPedidoConfirmado(any(), any());
    }
}
