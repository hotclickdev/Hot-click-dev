package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.TilopayService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR de caja: pago con el método elegido (Tilopay)")
class PosQrMetodosPagoTest {
    @Mock PosQrSesionRepository posQrRepo;
    @Mock TilopayService tilopayService;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @InjectMocks PosQrVentaService service;

    @Test
    @DisplayName("SINPE en un cobro que también acepta tarjeta: queda como SINPE")
    void sinpeEnCobroMixto() {
        PosQrSesion s = PosQrMetodosTest.sesion("TARJETA", "TARJETA,SINPE");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        when(tilopayService.isPagosDisponibles()).thenReturn(true);
        service.iniciarTilopay("tok", "SINPE");
        assertThat(s.getMetodoPago()).isEqualTo("SINPE");
    }

    @Test
    @DisplayName("SINPE no habilitado por la caja: queda en tarjeta")
    void sinpeNoHabilitado() {
        PosQrSesion s = PosQrMetodosTest.sesion("TARJETA", "TARJETA");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        when(tilopayService.isPagosDisponibles()).thenReturn(true);
        service.iniciarTilopay("tok", "SINPE");
        assertThat(s.getMetodoPago()).isEqualTo("TARJETA");
    }

    @Test
    @DisplayName("Sin pasarela disponible: se rechaza")
    void sinPasarela() {
        PosQrSesion s = PosQrMetodosTest.sesion("SINPE", "SINPE");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        lenient().when(tilopayService.isPagosDisponibles()).thenReturn(false);
        assertThatThrownBy(() -> service.iniciarTilopay("tok", "SINPE")).isInstanceOf(IllegalStateException.class);
    }
}
