package com.hotclick.service.pos;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** La venta directa de caja nace ENTREGADO: solo EFECTIVO (#221; SINPE por G1 va por QR). */
@DisplayName("[POS] venta directa solo con cobro en mano")
class PosVentaMetodoTest {

    @ParameterizedTest
    @ValueSource(strings = {"TARJETA", "onvo", "STRIPE", "TILOPAY", "DESCONOCIDO", " ", "SINPE", " sinpe "})
    void pasarelaSeRechaza(String metodo) {
        assertThatThrownBy(() -> PosVentaService.exigirMetodoSinPasarela(metodo))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"EFECTIVO", "efectivo", " Efectivo "})
    void enManoSePermite(String metodo) {
        assertThatCode(() -> PosVentaService.exigirMetodoSinPasarela(metodo)).doesNotThrowAnyException();
    }
}
