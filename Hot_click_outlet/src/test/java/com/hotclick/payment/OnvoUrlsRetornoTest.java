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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("ONVO: success/cancel URL salen de app.url configurada, nunca de un host fijo")
class OnvoUrlsRetornoTest {

    @Test
    void successYCancelUsanLaBaseConfigurada() throws Exception {
        for (String base : new String[] {"https://hotclick.lat", "https://staging.hotclick.test"}) {
            OnvoService onvo = mock(OnvoService.class);
            when(onvo.isPagosDisponibles()).thenReturn(true);
            when(onvo.isMockMode()).thenReturn(false);
            when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap()))
                .thenReturn(new OnvoService.OnvoCheckoutSession("cs_1", "https://checkout"));
            OnvoPaymentProvider p = new OnvoPaymentProvider();
            ReflectionTestUtils.setField(p, "onvoService", onvo);
            ReflectionTestUtils.setField(p, "appUrl", base);
            Pedido pedido = new Pedido();
            pedido.setId(1L);
            pedido.setNumeroPedido("HC-1");
            pedido.setTotalPedido(1000);
            pedido.setEmpresa(new Empresa());

            p.crearSesion(pedido, new Usuario());

            ArgumentCaptor<String> ok = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<String> ko = ArgumentCaptor.forClass(String.class);
            verify(onvo).crearCheckoutSession(eq(1000), anyString(), ok.capture(), ko.capture(), any(), anyMap());
            assertThat(ok.getValue()).isEqualTo(base + "/pago/exito?order=HC-1").doesNotContain("localhost");
            assertThat(ko.getValue()).isEqualTo(base + "/pago/cancelado?order=HC-1").doesNotContain("localhost");
        }
    }
}
