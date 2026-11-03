package com.hotclick.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.OnvoService;
import com.hotclick.service.payment.PedidoStatusTokenService;
import com.hotclick.service.payment.PedidoStatusTokenServiceTest;
import com.hotclick.utils.Constants;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

/** QA5 ALTO + #501: el pedido invitado de la tienda pública vuelve de ONVO con st= válido solo para él. */
class OnvoUrlRetornoTiendaTest {

    @Test
    void pedidoInvitadoDeTiendaLlevaStValido() throws Exception {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap()))
            .thenReturn(new OnvoService.OnvoCheckoutSession("cs_t", "https://checkout"));
        PedidoStatusTokenService tokens = PedidoStatusTokenServiceTest.servicio();
        OnvoPaymentProvider p = new OnvoPaymentProvider();
        ReflectionTestUtils.setField(p, "onvoService", onvo);
        ReflectionTestUtils.setField(p, "pedidoStatusTokenService", tokens);
        ReflectionTestUtils.setField(p, "appUrl", "https://hotclick.lat");
        Pedido pedido = new Pedido();
        pedido.setId(7L);
        pedido.setNumeroPedido("HC-T-7");
        pedido.setTotalPedido(5000);
        pedido.setMetodoEnvio(Constants.ENVIO_RETIRO);
        pedido.setEmpresa(new Empresa());

        Usuario invitado = new Usuario(); // GuestUserResolver crea/usa un usuario invitado
        invitado.setCorreo("ana@example.com");
        p.crearSesion(pedido, invitado);

        ArgumentCaptor<String> ok = ArgumentCaptor.forClass(String.class);
        verify(onvo).crearCheckoutSession(eq(5000), anyString(), ok.capture(), anyString(), any(), anyMap());
        String url = ok.getValue();
        assertThat(url).startsWith("https://hotclick.lat/pago/exito?order=HC-T-7&st=");
        String st = URLDecoder.decode(url.substring(url.indexOf("&st=") + 4), StandardCharsets.UTF_8);
        assertThat(tokens.esValido("HC-T-7", st)).isTrue();
        assertThat(tokens.esValido("HC-T-8", st)).isFalse();
    }
}
