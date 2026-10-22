package com.hotclick.service.pos;

import com.hotclick.exception.PosMetodoNoDisponibleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SINPE fuera de ONVO: el cobro QR del POS rechaza SINPE")
class PosQrSinpeRechazadoTest {

    private final PosQrSessionService service = new PosQrSessionService();
    private final List<Map<String, Object>> items = List.of(Map.of("productoId", 1, "cantidad", 1));

    @Test
    @DisplayName("metodoPago SINPE se rechaza")
    void principalSinpe() {
        assertThatThrownBy(() -> service.crearSesion(1L, 1L, null, "SINPE", null, items, null, null, null))
            .isInstanceOf(PosMetodoNoDisponibleException.class);
    }

    @Test
    @DisplayName("SINPE dentro de metodosPago (lista o CSV, cualquier mayúscula) se rechaza")
    void sinpeEnLista() {
        assertThatThrownBy(() -> service.crearSesion(1L, 1L, null, "TARJETA", List.of("TARJETA", "sinpe"), items, null, null, null))
            .isInstanceOf(PosMetodoNoDisponibleException.class);
        assertThatThrownBy(() -> service.crearSesion(1L, 1L, null, "TARJETA", "TARJETA, SINPE", items, null, null, null))
            .isInstanceOf(PosMetodoNoDisponibleException.class);
    }
}
