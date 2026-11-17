package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("[SEC-08] Teléfono de bodega: misma regla que el front")
class TelefonoBodegaTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
        "+50600000002|+50600000002",
        "+506 0000-0002|+50600000002",
        "  +506 (0000) 0002  |+50600000002",
        "0000-0002|+50600000002",
        "00000002|+50600000002",
        "50600000002|+50600000002",
        "+1 305 555 1234|+13055551234",
        "+34 612 345 678|+34612345678",
        "+52.55.1234.5678|+525512345678",
    })
    void validos(String entrada, String esperado) {
        assertThat(TelefonoBodega.normalizar(entrada)).isEqualTo(esperado);
    }

    @ParameterizedTest(name = "inválido: {0}")
    @ValueSource(strings = {
        "abc", "<b>x</b>", "0000-0002<script>", "+506 0000 000", "+506000000002", "+00000028",
        "1234567", "123456789", "+1234567", "+1234567890123456", "+0123456789",
        "++50600000002", "506+00000002", "0000_0002", "1111111111111111111111111111111111111111",
        "' OR 1=1 --", "+506 0000 0002 ext 5",
    })
    void invalidos(String entrada) {
        assertThatThrownBy(() -> TelefonoBodega.normalizar(entrada))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(TelefonoBodega.MENSAJE_INVALIDO);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "( )", "- -"})
    void vacios(String entrada) {
        assertThatThrownBy(() -> TelefonoBodega.normalizar(entrada))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(TelefonoBodega.MENSAJE_OBLIGATORIO);
    }
}
