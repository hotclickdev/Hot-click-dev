package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("POS SINPE por ONVO")
class PosSinpeOnvoServiceTest {

    private static final String DESTINO = "DESTINO_ONVO_PRUEBA";
    private static final String IDENT = "01-0000-0000";
    private static final String TEL = "8000 0000";
    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 1, 1, 10, 0);

    private OnvoService onvo;
    private PosQrSesionRepository repo;
    private PosSinpeOnvoService svc;
    private PosQrSesion sesion;

    @BeforeEach
    void armar() {
        onvo = mock(OnvoService.class);
        repo = mock(PosQrSesionRepository.class);
        svc = new PosSinpeOnvoService();
        svc.setOnvoServiceParaTest(onvo);
        svc.setRepoParaTest(repo);
        svc.setTimeoutMinutosParaTest("10");
        svc.setClock(Clock.fixed(AHORA.atZone(Constants.ZONA_CR).toInstant(), Constants.ZONA_CR));
        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.sinpeDestino()).thenReturn(DESTINO);
        sesion = PosQrMetodosTest.sesion("TARJETA", "TARJETA,SINPE");
        sesion.setId(7L);
        sesion.setToken("tok");
        sesion.setEstado("PENDIENTE");
        sesion.setTotal(5000);
        sesion.setFechaExpiracion(AHORA.plusMinutes(30));
        when(repo.findByToken("tok")).thenReturn(Optional.of(sesion));
    }

    @Test
    @DisplayName("Crea y confirma el intent antes de transferir; devuelve destino de config y monto exacto")
    void iniciaCreaYConfirma() {
        when(onvo.crearPaymentIntent(eq(5000), anyString(), anyMap())).thenReturn(new OnvoService.OnvoPaymentIntent("pi_1"));
        when(onvo.crearMetodoPagoSinpePos(IDENT, 0, TEL, null)).thenReturn(new OnvoService.OnvoPaymentMethod("pm_1"));

        Map<String, Object> r = svc.iniciar("tok", IDENT, 0, TEL);

        assertThat(r).containsEntry("destino", DESTINO).containsEntry("monto", 5000).containsEntry("moneda", "CRC");
        assertThat(sesion.getStripeSessionId()).isEqualTo("ONVOPI:pi_1");
        assertThat(sesion.getMetodoPago()).isEqualTo("SINPE");
        assertThat(sesion.getFechaExpiracion()).isEqualTo(AHORA.plusMinutes(10));
        var orden = inOrder(onvo, repo);
        orden.verify(onvo).crearPaymentIntent(eq(5000), anyString(), anyMap());
        orden.verify(repo).save(sesion);
        orden.verify(onvo).confirmarPaymentIntent("pi_1", "pm_1");
    }

    @Test
    @DisplayName("Identificación inválida o tipo fuera de 1–4: no toca ONVO")
    void identificacionInvalida() {
        assertThatThrownBy(() -> svc.iniciar("tok", "123", 0, TEL)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.iniciar("tok", IDENT, 6, TEL)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.iniciar("tok", IDENT, 0, "123")).hasMessage(PosSinpeOnvoService.MSG_TELEFONO);
        assertThatThrownBy(() -> svc.iniciar("tok", IDENT, 0, null)).hasMessage(PosSinpeOnvoService.MSG_TELEFONO);
        verify(onvo, never()).crearPaymentIntent(anyInt(), any(), any());
    }

    @Test
    @DisplayName("Sin destino, en modo simulado o sin timeout: fail-closed")
    void failClosed() {
        when(onvo.sinpeDestino()).thenReturn("");
        assertThatThrownBy(() -> svc.iniciar("tok", IDENT, 0, TEL)).hasMessage(PosSinpeOnvoService.MSG_NO_DISPONIBLE);
        when(onvo.sinpeDestino()).thenReturn(DESTINO);
        when(onvo.isMockMode()).thenReturn(true);
        assertThat(svc.destinoDisponible()).isEmpty();
        when(onvo.isMockMode()).thenReturn(false);
        svc.setTimeoutMinutosParaTest("");
        assertThat(svc.destinoDisponible()).isEmpty();
        svc.setTimeoutMinutosParaTest("0");
        assertThat(svc.destinoDisponible()).isEmpty();
        verify(onvo, never()).crearPaymentIntent(anyInt(), any(), any());
    }

    @Test
    @DisplayName("Sesión sin SINPE habilitado: se rechaza")
    void sinSinpe() {
        sesion.setMetodosHabilitados("TARJETA");
        assertThatThrownBy(() -> svc.iniciar("tok", IDENT, 0, TEL)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Intent previo que ONVO no cancela: no se crea otro")
    void previoSinCancelar() {
        sesion.setStripeSessionId("ONVOPI:pi_viejo");
        when(onvo.cancelarPaymentIntent("pi_viejo")).thenReturn("");
        assertThatThrownBy(() -> svc.iniciar("tok", IDENT, 0, TEL)).isInstanceOf(IllegalStateException.class);
        verify(onvo, never()).crearPaymentIntent(anyInt(), any(), any());
    }

    @Test
    @DisplayName("Clasificación: solo succeeded + monto ×100 + CRC es pagado; deferred espera")
    void clasificar() {
        assertThat(PosSinpeOnvoService.clasificar(Map.of("id", "pi_1", "status", "succeeded", "mode", "live", "amount", 500000, "currency", "CRC"), "pi_1", 5000, "live"))
            .isEqualTo(PosSinpeOnvoService.EstadoIntent.PAGADO);
        assertThat(PosSinpeOnvoService.clasificar(Map.of("id", "pi_1", "status", "succeeded", "mode", "live", "amount", 400000, "currency", "CRC"), "pi_1", 5000, "live"))
            .isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(PosSinpeOnvoService.clasificar(Map.of("id", "pi_1", "status", "succeeded", "mode", "live", "amount", 500000, "currency", "USD"), "pi_1", 5000, "live"))
            .isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(PosSinpeOnvoService.clasificar(Map.of("id", "pi_otro", "status", "succeeded", "mode", "live", "amount", 500000, "currency", "CRC"), "pi_1", 5000, "live"))
            .isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(PosSinpeOnvoService.clasificar(Map.of("id", "pi_1", "status", "deferred"), "pi_1", 5000, "live"))
            .isEqualTo(PosSinpeOnvoService.EstadoIntent.ESPERANDO);
        assertThat(PosSinpeOnvoService.clasificar(Map.of("id", "pi_1", "status", "canceled"), "pi_1", 5000, "live"))
            .isEqualTo(PosSinpeOnvoService.EstadoIntent.CANCELADO);
    }

    @Test
    @DisplayName("ALTO 3: succeeded sin mode, con otro mode o sin modo esperado nunca es pagado")
    void modoExigido() {
        Map<String, Object> sinModo = Map.of("id", "pi_1", "status", "succeeded", "amount", 500000, "currency", "CRC");
        Map<String, Object> test = Map.of("id", "pi_1", "status", "succeeded", "mode", "test", "amount", 500000, "currency", "CRC");
        assertThat(PosSinpeOnvoService.clasificar(sinModo, "pi_1", 5000, "live")).isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(PosSinpeOnvoService.clasificar(test, "pi_1", 5000, "live")).isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(PosSinpeOnvoService.clasificar(test, "pi_1", 5000, null)).isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(PosSinpeOnvoService.clasificar(test, "pi_1", 5000, "test")).isEqualTo(PosSinpeOnvoService.EstadoIntent.PAGADO);
    }

    @Test
    @DisplayName("ALTO 3: ONVO no disponible (llave test sin opt-in) no consulta ni da por pagado")
    void noDisponibleNoPaga() {
        sesion.setStripeSessionId("ONVOPI:pi_1");
        when(onvo.isPagosDisponibles()).thenReturn(false);
        assertThat(svc.estadoIntent(sesion)).isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        verify(onvo, never()).obtenerPaymentIntent(any());
    }

    @Test
    @DisplayName("Modo simulado nunca da por pagado")
    void mockNoPaga() {
        sesion.setStripeSessionId("ONVOPI:pi_1");
        when(onvo.isMockMode()).thenReturn(true);
        assertThat(svc.estadoIntent(sesion)).isEqualTo(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        verify(onvo, never()).obtenerPaymentIntent(any());
    }

    @Test
    @DisplayName("Cancelar: true solo con status canceled")
    void cancelar() {
        sesion.setStripeSessionId("ONVOPI:pi_1");
        when(onvo.cancelarPaymentIntent("pi_1")).thenReturn("canceled", "succeeded");
        assertThat(svc.cancelarIntent(sesion)).isTrue();
        assertThat(svc.cancelarIntent(sesion)).isFalse();
    }

    @Test
    @DisplayName("P-04: esCobroDePrueba solo con intent ONVO y llave no live")
    void esCobroDePrueba() {
        PosQrSesion ses = new PosQrSesion();
        ses.setStripeSessionId("ONVOPI:pi_1");
        when(onvo.modoEsperado()).thenReturn("test");
        org.assertj.core.api.Assertions.assertThat(svc.esCobroDePrueba(ses)).isTrue();
        when(onvo.modoEsperado()).thenReturn("live");
        org.assertj.core.api.Assertions.assertThat(svc.esCobroDePrueba(ses)).isFalse();
        ses.setStripeSessionId("cs_tarjeta");
        when(onvo.modoEsperado()).thenReturn("test");
        org.assertj.core.api.Assertions.assertThat(svc.esCobroDePrueba(ses)).isFalse();
    }
}
