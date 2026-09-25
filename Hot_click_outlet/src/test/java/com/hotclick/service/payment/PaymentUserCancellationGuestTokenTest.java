package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentUserCancellation — guest cancel con token")
class PaymentUserCancellationGuestTokenTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PaymentFailureHandler paymentFailureHandler;
    @Mock private GuestCancelTokenService guestCancelTokenService;

    @InjectMocks private PaymentUserCancellationService service;

    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void setUp() {
        pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-ABC");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);

        pago = new Pago();
        pago.setId(2L);
        pago.setPedido(pedido);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("token inválido → SecurityException y no cancela")
    void tokenInvalido_rechaza() {
        when(guestCancelTokenService.esValido("ORD-ABC", "malo")).thenReturn(false);

        assertThatThrownBy(() -> service.cancelarAnon("ORD-ABC", "malo"))
            .isInstanceOf(SecurityException.class);

        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("token válido → cancela pago pendiente")
    void tokenValido_cancela() {
        when(guestCancelTokenService.esValido("ORD-ABC", "ok")).thenReturn(true);
        when(pedidoRepository.findByNumeroPedido("ORD-ABC")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(1L)).thenReturn(Optional.of(pago));

        service.cancelarAnon("ORD-ABC", "ok");

        verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }
}
