package com.hotclick.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.OnvoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("ONVO en modo simulado (dev/test sin llave) crea sesión sin cobrar; sin pagos disponibles sigue fallando cerrado")
class OnvoPaymentProviderModoSimuladoTest {

    private Pedido pedido() {
        Empresa e = new Empresa();
        e.setId(7L);
        Pedido p = new Pedido();
        p.setId(1L);
        p.setNumeroPedido("HC-1");
        p.setTotalPedido(1000);
        p.setEmpresa(e);
        return p;
    }

    private OnvoPaymentProvider provider(OnvoService onvo) {
        OnvoPaymentProvider p = new OnvoPaymentProvider();
        ReflectionTestUtils.setField(p, "onvoService", onvo);
        ReflectionTestUtils.setField(p, "pedidoStatusTokenService", com.hotclick.service.payment.PedidoStatusTokenServiceTest.servicio());
        ReflectionTestUtils.setField(p, "appUrl", "https://hotclick.lat");
        return p;
    }

    @Test
    @DisplayName("mockMode → PaymentSession simulada con enlace al éxito del pedido")
    void mockDevuelveSesionSimulada() throws Exception {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isMockMode()).thenReturn(true);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        // Igual que OnvoService en mock: no llama a ONVO y devuelve el successUrl.
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap()))
            .thenAnswer(i -> new OnvoService.OnvoCheckoutSession("onvo_mock_1", i.getArgument(2)));

        PaymentSession s = provider(onvo).crearSesion(pedido(), new Usuario());

        assertThat(s.externalId()).startsWith("onvo_mock_");
        assertThat(s.redirectUrl()).startsWith("https://hotclick.lat/pago/exito?order=HC-1");
    }

    @Test
    @DisplayName("sin pagos disponibles (ni mock) → falla cerrado")
    void sinPagosFallaCerrado() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isMockMode()).thenReturn(false);
        when(onvo.isPagosDisponibles()).thenReturn(false);

        assertThatThrownBy(() -> provider(onvo).crearSesion(pedido(), new Usuario()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ONVO no está configurado");
    }
}
