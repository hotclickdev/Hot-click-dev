package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BarcodeNormalizer")
class BarcodeNormalizerTest {

    @Test
    void aceptaCodigoValido() {
        assertThat(BarcodeNormalizer.normalize("7501234567890")).isEqualTo("7501234567890");
    }

    @Test
    void recortaEspacios() {
        assertThat(BarcodeNormalizer.normalize("  7501234567890\n")).isEqualTo("7501234567890");
    }

    @Test
    void rechazaVacioOCorto() {
        assertThat(BarcodeNormalizer.normalize(null)).isNull();
        assertThat(BarcodeNormalizer.normalize("")).isNull();
        assertThat(BarcodeNormalizer.normalize("12")).isNull();
        assertThat(BarcodeNormalizer.normalize("  abc ")).isNull();
    }
}
