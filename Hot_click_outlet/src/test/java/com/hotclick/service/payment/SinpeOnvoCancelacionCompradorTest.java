package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.sinpe.SinpeOnvoMarketplaceService;
import com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** N-01 ALTO: cancelar un pedido SINPE-ONVO del marketplace cierra el intent en ONVO o no cancela (409). */
class SinpeOnvoCancelacionCompradorTest {

    PedidoRepository pedidos = mock(PedidoRepository.class);
    PagoRepository pagos = mock(PagoRepository.class);
    PaymentFailureHandler fallos = mock(PaymentFailureHandler.class);
    GuestCancelTokenService tokens = mock(GuestCancelTokenService.class);
    OnvoService onvo = mock(OnvoService.class);
    SinpeOnvoMarketplaceService sinpe = mock(SinpeOnvoMarketplaceService.class);
    PaymentUserCancellationService service = new PaymentUserCancellationService();
    Pago pago;

    @BeforeEach
    void armar() {
        ReflectionTestUtils.setField(service, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(service, "pagoRepository", pagos);
        ReflectionTestUtils.setField(service, "paymentFailureHandler", fallos);
        ReflectionTestUtils.setField(service, "guestCancelTokenService", tokens);
        ReflectionTestUtils.setField(service, "onvoPaymentProvider", mock(OnvoPaymentProvider.class));
        ReflectionTestUtils.setField(service, "onvoService", onvo);
        ReflectionTestUtils.setField(service, "sinpeOnvoMarketplaceService", sinpe);
        Usuario u = new Usuario();
        u.setCorreo("comprador@example.test");
        Pedido pedido = new Pedido();
        pedido.setId(31L);
        pedido.setNumeroPedido("HC-N01");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setUsuarioFinal(u);
        pago = new Pago();
        pago.setId(9L);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMerchantToken("ONVOPI:pi_9");
        pago.setPedido(pedido);
        when(pedidos.findByNumeroPedido("HC-N01")).thenReturn(Optional.of(pedido));
        when(pagos.findTopByPedidoId(31L)).thenReturn(Optional.of(pago));
        when(tokens.esValido("HC-N01", "ok")).thenReturn(true);
    }

    @Test
    @DisplayName("intent cancelado y confirmado por GET: el pedido se cancela (usuario e invitado)")
    void canceladoEnOnvo() {
        when(sinpe.cerrarIntentParaComprador(pago)).thenReturn(CierreComprador.CANCELADO);
        assertThatCode(() -> service.cancelarPorUsuario("HC-N01", "comprador@example.test")).doesNotThrowAnyException();
        assertThatCode(() -> service.cancelarAnon("HC-N01", "ok")).doesNotThrowAnyException();
        verify(fallos, times(2)).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("ONVO ya cobró o no se confirmó: no cancela (IllegalStateException → 409) ni libera stock")
    void failClosed() {
        when(sinpe.cerrarIntentParaComprador(pago)).thenReturn(CierreComprador.PAGADO, CierreComprador.NO_CONFIRMADO);
        assertThatThrownBy(() -> service.cancelarPorUsuario("HC-N01", "comprador@example.test"))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.cancelarAnon("HC-N01", "ok")).isInstanceOf(IllegalStateException.class);
        verify(fallos, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("modo simulado explícito: cancela sin intent real")
    void simulado() {
        when(sinpe.cerrarIntentParaComprador(pago)).thenReturn(CierreComprador.SIMULADO);
        assertThatCode(() -> service.cancelarAnon("HC-N01", "ok")).doesNotThrowAnyException();
        verify(fallos).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("SINPE manual (sin ONVOPI:) no consulta ONVO")
    void sinpeManualNoConsulta() {
        pago.setMerchantToken("SINPE-123");
        assertThatCode(() -> service.cancelarAnon("HC-N01", "ok")).doesNotThrowAnyException();
        verifyNoInteractions(sinpe);
    }
}
