package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** P-04 (C3): cobro ONVO con llave de prueba deja todos los pedidos del grupo marcados es_prueba. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OnvoPedidoPruebaTest {

    @Mock PagoRepository pagoRepository;
    @Mock WebhookEventRepository webhookEventRepository;
    @Mock PaymentService paymentService;
    @Mock PedidoGrupoService pedidoGrupoService;
    @Mock PedidoRepository pedidoRepository;
    @Mock OnvoService onvoService;
    @InjectMocks OnvoCapturaService captura;

    private Pedido p1, p2;

    @BeforeEach
    void armar() {
        p1 = new Pedido(); p2 = new Pedido();
        Pago pago = new Pago();
        pago.setMerchantToken("cs_1");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p1);
        when(pagoRepository.findByMerchantTokenForUpdate("cs_1")).thenReturn(Optional.of(pago));
        when(webhookEventRepository.existsByMerchantTokenAndEventoTipo(anyString(), anyString())).thenReturn(false);
        when(pedidoGrupoService.delGrupo(p1)).thenReturn(List.of(p1, p2));
    }

    @Test
    void llaveDePrueba_marcaElGrupo() {
        when(onvoService.modoEsperado()).thenReturn("test");
        assertThat(captura.capturarVerificado("cs_1", "{}", "webhook")).isEqualTo(OnvoCapturaService.Captura.CAPTURADO);
        assertThat(p1.isEsPrueba()).isTrue();
        assertThat(p2.isEsPrueba()).isTrue();
        verify(pedidoRepository).save(p1);
        verify(pedidoRepository).save(p2);
    }

    @Test
    void llaveLive_noMarca() {
        when(onvoService.modoEsperado()).thenReturn("live");
        captura.capturarVerificado("cs_1", "{}", "webhook");
        assertThat(p1.isEsPrueba()).isFalse();
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    void sinOnvoService_failClosedMarca() {
        org.springframework.test.util.ReflectionTestUtils.setField(captura, "onvoService", null);
        captura.capturarVerificado("cs_1", "{}", "webhook");
        assertThat(p1.isEsPrueba()).isTrue();
    }

}
