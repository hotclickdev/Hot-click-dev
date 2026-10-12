package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.service.SinpeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** CMP-3: stock insuficiente en el checkout SINPE de invitado → 409 sin revelar el stock; error inesperado → 500 genérico. */
@DisplayName("CMP-3 | errores del checkout SINPE")
class SinpeCheckoutErroresTest {

    private SinpeController controller(SinpeService service) {
        SinpeController c = new SinpeController();
        ReflectionTestUtils.setField(c, "sinpeService", service);
        return c;
    }

    @Test
    void stockInsuficiente409() {
        SinpeService s = mock(SinpeService.class);
        when(s.checkout(any(), isNull())).thenThrow(new StockInsuficienteException("Taza", 7, 99));
        var res = controller(s).guestCheckout(new PaymentCheckoutRequest());
        assertThat(res.getStatusCode().value()).isEqualTo(409);
        assertThat(res.getBody().getMessage()).contains("Taza").doesNotContain("7").doesNotContain("99");
    }

    @Test
    void inesperado500Generico() {
        SinpeService s = mock(SinpeService.class);
        when(s.checkout(any(), isNull())).thenThrow(new RuntimeException("SQL insert into hot_click_pedido_tb"));
        var res = controller(s).guestCheckout(new PaymentCheckoutRequest());
        assertThat(res.getStatusCode().value()).isEqualTo(500);
        assertThat(res.getBody().getMessage()).doesNotContain("hot_click");
    }
}
