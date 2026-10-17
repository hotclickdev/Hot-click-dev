package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.service.PaymentService;
import com.hotclick.service.envio.ContraEntregaPolitica;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("Checkout: contra entrega solo con envío normal")
class PaymentCheckoutContraEntregaTest {

    @Mock PaymentService paymentService;
    @Mock com.hotclick.service.payment.TilopayConfirmacionService tilopayConfirmacionService;
    @InjectMocks PaymentController controller;

    private static PaymentCheckoutRequest req(String provider, String metodo) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setProvider(provider);
        r.setMetodoEnvio(metodo);
        return r;
    }

    @Test
    void contraEntregaConExpress400SinLlamarAlServicio() throws Exception {
        var res = controller.checkout(req("CONTRA_ENTREGA", "EXPRESS"));
        assertThat(res.getStatusCode().value()).isEqualTo(400);
        verify(paymentService, never()).checkout(any(), any());
    }

    @Test
    void contraEntregaSinMetodoOPaqueteNoNormal400() {
        assertThat(controller.checkout(req("contra_entrega", null)).getStatusCode().value()).isEqualTo(400);
        PaymentCheckoutRequest r = req("CONTRA_ENTREGA", "ENVIO_NORMAL");
        PaymentCheckoutRequest.EnvioPaqueteDTO p = new PaymentCheckoutRequest.EnvioPaqueteDTO();
        p.setMetodoEnvio("RAPIDO");
        r.setEnvios(List.of(p));
        assertThat(controller.checkout(r).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void contraEntregaConEnvioNormalYOtrosProvidersPasan() {
        assertThatCode(() -> ContraEntregaPolitica.validarCheckout(req("CONTRA_ENTREGA", "ENVIO_NORMAL"))).doesNotThrowAnyException();
        assertThatCode(() -> ContraEntregaPolitica.validarCheckout(req("ONVO", "EXPRESS"))).doesNotThrowAnyException();
    }
}
