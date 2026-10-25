package com.hotclick.service.pos;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** ALTO 3: el QR del POS ya no cobra ni confirma por Tilopay. */
class PosQrTilopayTest {

    @Test
    void tilopayRetiradoDelQr() {
        assertThat(java.util.Arrays.stream(PosQrVentaService.class.getDeclaredFields()))
            .noneMatch(f -> f.getType().getSimpleName().equals("TilopayService"));
        assertThat(java.util.Arrays.stream(PosQrVentaService.class.getDeclaredMethods()))
            .noneMatch(m -> m.getName().equals("coincideTilopay"));
    }
}
