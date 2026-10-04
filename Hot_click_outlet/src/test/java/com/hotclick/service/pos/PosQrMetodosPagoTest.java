package com.hotclick.service.pos;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.StripeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR de caja: pago con el método elegido")
class PosQrMetodosPagoTest {
    @Mock PosQrSesionRepository posQrRepo;
    @Mock StripeService stripeService;
    @Mock OnvoService onvoService;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @InjectMocks PosQrVentaService service;

    @Test
    @DisplayName("SINPE en un cobro que también acepta tarjeta: queda como SINPE")
    void sinpeEnCobroMixto() {
        PosQrSesion s = PosQrMetodosTest.sesion("TARJETA", "TARJETA,SINPE");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        when(sessionService.getMapper()).thenReturn(new ObjectMapper());
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.crearPaymentIntent(eq(5000), any(), any()))
            .thenReturn(new OnvoService.OnvoPaymentIntent("onvo_pi"));
        when(onvoService.crearMetodoPagoSinpe(any(), any(), any(), any()))
            .thenReturn(new OnvoService.OnvoPaymentMethod("onvo_pm"));
        ReflectionTestUtils.setField(service, "onvoSinpeDestino", "+50670196686");

        service.iniciarSinpeOnvo("tok", "8888-0000", "101110111", "Ana Perez", null);

        assertThat(s.getMetodoPago()).isEqualTo("SINPE");
    }

    @Test
    @DisplayName("SINPE no habilitado por la caja: se rechaza")
    void sinpeNoHabilitado() {
        PosQrSesion s = PosQrMetodosTest.sesion("TARJETA", "TARJETA");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        assertThatThrownBy(() -> service.iniciarSinpeOnvo("tok", "8888-0000", "101110111", "Ana", null))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Checkout hospedado deja el cobro fijo en tarjeta")
    void hostedFijaTarjeta() {
        PosQrSesion s = PosQrMetodosTest.sesion("SINPE", "SINPE,TARJETA");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        when(sessionService.getMapper()).thenReturn(new ObjectMapper());
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.crearCheckoutSession(eq(5000), any(), any(), any(), any(), any()))
            .thenReturn(new OnvoService.OnvoCheckoutSession("onvo_cs", "https://pay.onvo.test/cs"));
        ReflectionTestUtils.setField(service, "appUrl", "https://hotclick.lat");

        service.crearStripeCheckout("tok");

        assertThat(s.getMetodoPago()).isEqualTo("TARJETA");
        assertThat(PosQrMetodos.deSesion(s)).containsExactly("TARJETA");
    }
}
