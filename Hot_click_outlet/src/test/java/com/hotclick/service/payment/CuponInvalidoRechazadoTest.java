package com.hotclick.service.payment;

import com.hotclick.model.Cupon;
import com.hotclick.service.CuponService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** CMP-2: cupón inexistente → 400 con mensaje, en vez de crear el pedido sin descuento y sin aviso. */
class CuponInvalidoRechazadoTest {

    private OrderPricingService servicio(CuponService cupones) {
        OrderPricingService s = new OrderPricingService();
        ReflectionTestUtils.setField(s, "cuponService", cupones);
        return s;
    }

    @Test
    void cuponQueNoExisteSeRechaza() {
        CuponService cupones = mock(CuponService.class);
        when(cupones.validarParaEmpresa(any(), any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> servicio(cupones).exigirCuponValido("QATEST-NOEXISTE", List.of(7L)))
            .isInstanceOf(IllegalArgumentException.class).hasMessage(OrderPricingService.MSG_CUPON_INVALIDO);
    }

    @Test
    void cuponDeUnoDeLosNegociosPasa() {
        CuponService cupones = mock(CuponService.class);
        when(cupones.validarParaEmpresa(any(), any())).thenReturn(Optional.empty());
        when(cupones.validarParaEmpresa(eq("SOL10"), eq(8L))).thenReturn(Optional.of(new Cupon()));
        assertThatCode(() -> servicio(cupones).exigirCuponValido("SOL10", Arrays.asList(7L, 8L, null))).doesNotThrowAnyException();
    }

    @Test
    void sinCuponNoSeValida() {
        assertThatCode(() -> servicio(mock(CuponService.class)).exigirCuponValido(" ", List.of(7L))).doesNotThrowAnyException();
    }
}
