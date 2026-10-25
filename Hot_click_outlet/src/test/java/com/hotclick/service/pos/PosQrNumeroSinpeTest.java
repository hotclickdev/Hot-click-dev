package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("Destino SINPE del POS: solo el de ONVO, nunca un teléfono del negocio")
class PosQrNumeroSinpeTest {

    private static final String DESTINO = "DESTINO_ONVO_PRUEBA";

    private PosQrSesion sesion(String metodos) {
        PosQrSesion s = PosQrMetodosTest.sesion("TARJETA", metodos);
        return s;
    }

    @Test
    @DisplayName("SINPE habilitado: muestra el destino ONVO de config")
    void destinoOnvo() {
        PosSinpeOnvoService onvo = mock(PosSinpeOnvoService.class);
        when(onvo.destinoDisponible()).thenReturn(DESTINO);
        PosQrSessionService svc = new PosQrSessionService();
        svc.setSinpeOnvoParaTest(onvo);
        assertThat(svc.destinoSinpe(sesion("TARJETA,SINPE"))).isEqualTo(DESTINO);
    }

    @Test
    @DisplayName("SINPE no habilitado: vacío, sin consultar ONVO")
    void sinSinpeVacio() {
        PosSinpeOnvoService onvo = mock(PosSinpeOnvoService.class);
        PosQrSessionService svc = new PosQrSessionService();
        svc.setSinpeOnvoParaTest(onvo);
        assertThat(svc.destinoSinpe(sesion("TARJETA"))).isEmpty();
        verifyNoInteractions(onvo);
    }

    @Test
    @DisplayName("Sin ONVO o sin destino: vacío (fail-closed)")
    void failClosed() {
        PosQrSessionService svc = new PosQrSessionService();
        assertThat(svc.destinoSinpe(sesion("SINPE"))).isEmpty();
        PosSinpeOnvoService onvo = mock(PosSinpeOnvoService.class);
        when(onvo.destinoDisponible()).thenReturn("");
        svc.setSinpeOnvoParaTest(onvo);
        assertThat(svc.destinoSinpe(sesion("SINPE"))).isEmpty();
    }
}
