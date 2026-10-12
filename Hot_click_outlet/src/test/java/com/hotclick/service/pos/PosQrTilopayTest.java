package com.hotclick.service.pos;

import com.hotclick.service.TilopayService.ConsultaResultado;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Cobro POS por QR con Tilopay: solo se completa si Tilopay reporta el monto, CRC y la orden exactos. */
class PosQrTilopayTest {

    private static ConsultaResultado c(boolean ok, String monto, String moneda, String orden, boolean sim) {
        return new ConsultaResultado(ok, ok ? "1" : "0", "", "A", monto == null ? null : new BigDecimal(monto), moneda, orden, sim);
    }

    @Test
    void coincideTilopay() {
        assertThat(PosQrVentaService.coincideTilopay("POSQR-1", 4500, c(true, "4500", "CRC", "POSQR-1", false), false)).isTrue();
        assertThat(PosQrVentaService.coincideTilopay("POSQR-1", 4500, c(true, "45", "CRC", "POSQR-1", false), false)).isFalse();
        assertThat(PosQrVentaService.coincideTilopay("POSQR-1", 4500, c(true, "4500", "CRC", "POSQR-2", false), false)).isFalse();
        assertThat(PosQrVentaService.coincideTilopay("POSQR-1", 4500, c(false, "4500", "CRC", "POSQR-1", false), false)).isFalse();
        assertThat(PosQrVentaService.coincideTilopay("POSQR-1", 4500, c(true, null, null, null, true), false)).isFalse();
        assertThat(PosQrVentaService.coincideTilopay("POSQR-1", 4500, c(true, null, null, null, true), true)).isTrue();
    }
}
