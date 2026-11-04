package com.hotclick.payment;

import com.hotclick.service.OnvoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Reconsulta del barrido: sesión ya expirada en ONVO y /expire con 400. Fail-closed. */
@ExtendWith(MockitoExtension.class)
class OnvoPaymentProviderExpirarSinCobroTest {

    private static final String SESION = "cs_test_fake_1234";

    @Mock private OnvoService onvoService;
    @InjectMocks private OnvoPaymentProvider provider;

    private static HttpClientErrorException badRequest() {
        return HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", null, null, null);
    }

    @Test
    void yaExpiradaSinPagar_permiteSinLlamarExpire() {
        doReturn(Map.of("status", "expired", "paymentStatus", "unpaid")).when(onvoService).obtenerCheckoutSession(SESION);
        assertThat(provider.expirarSesionSinCobro(SESION)).isTrue();
        verify(onvoService, never()).expirarCheckoutSession(any());
    }

    @Test
    void expire400_yAlReleerExpiradaSinPagar_permite() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid"))
            .doReturn(Map.of("status", "expired", "paymentStatus", "unpaid"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        when(onvoService.expirarCheckoutSession(SESION)).thenThrow(badRequest());
        assertThat(provider.expirarSesionSinCobro(SESION)).isTrue();
    }

    @Test
    void expire400_yAlReleerPagada_bloquea() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid"))
            .doReturn(Map.of("status", "expired", "paymentStatus", "paid"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        when(onvoService.expirarCheckoutSession(SESION)).thenThrow(badRequest());
        assertThat(provider.expirarSesionSinCobro(SESION)).isFalse();
    }

    @Test
    void expire400_yAlReleerEnDuda_bloquea() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid"))
            .doReturn(Map.of())
            .when(onvoService).obtenerCheckoutSession(SESION);
        when(onvoService.expirarCheckoutSession(SESION)).thenThrow(badRequest());
        assertThat(provider.expirarSesionSinCobro(SESION)).isFalse();
    }

    @Test
    void expire400_yLaRelecturaFalla_relanza() {
        doReturn(Map.of("status", "open", "paymentStatus", "unpaid"))
            .doThrow(new IllegalStateException("caído"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        when(onvoService.expirarCheckoutSession(SESION)).thenThrow(badRequest());
        assertThatThrownBy(() -> provider.expirarSesionSinCobro(SESION)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void expiradaPeroPagada_noSeSaltaElExpire() {
        doReturn(Map.of("status", "expired", "paymentStatus", "paid")).when(onvoService).obtenerCheckoutSession(SESION);
        when(onvoService.expirarCheckoutSession(SESION)).thenReturn((Map) Map.of("status", "expired", "paymentStatus", "paid"));
        assertThat(provider.expirarSesionSinCobro(SESION)).isFalse();
    }
}
