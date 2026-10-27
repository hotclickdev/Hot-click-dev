package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.TilopayService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Venta POS con SINPE por ONVO")
class PosQrVentaSinpeOnvoTest {
    @Mock PosQrSesionRepository posQrRepo;
    @Mock TilopayService tilopayService;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @Mock PosSinpeOnvoService sinpeOnvo;
    @InjectMocks PosQrVentaService service;

    private PosQrSesion sesion;

    @BeforeEach
    void armar() {
        sesion = PosQrMetodosTest.sesion("SINPE", "SINPE");
        sesion.setToken("tokensinpeonvo01");
        sesion.setEstado("PENDIENTE");
        sesion.setTotal(5000);
        sesion.setStripeSessionId("ONVOPI:pi_1");
        lenient().when(posQrRepo.findByToken("tokensinpeonvo01")).thenReturn(Optional.of(sesion));
    }

    @Test
    @DisplayName("Vencido y ONVO confirma la cancelación: EXPIRADO")
    void vencidoCanceladoExpira() {
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.ESPERANDO);
        when(sinpeOnvo.cancelarIntent(sesion)).thenReturn(true);
        assertThat(service.verificarEstado("tokensinpeonvo01")).isEqualTo("EXPIRADO");
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Vencido pero ONVO no cancela: sigue PENDIENTE (la transferencia puede entrar)")
    void vencidoSinCancelarSiguePendiente() {
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        when(sinpeOnvo.cancelarIntent(sesion)).thenReturn(false);
        assertThat(service.verificarEstado("tokensinpeonvo01")).isEqualTo("PENDIENTE");
        verify(posQrRepo, never()).save(any());
    }

    @Test
    @DisplayName("Vigente y deferred: espera, no marca pagado ni cancela")
    void deferredEspera() {
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(5));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.ESPERANDO);
        assertThat(service.verificarEstado("tokensinpeonvo01")).isEqualTo("PENDIENTE");
        verify(sinpeOnvo, never()).cancelarIntent(any());
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Webhook succeeded que el GET no confirma: no cierra la venta")
    void webhookSinConfirmar() {
        when(posQrRepo.findByStripeSessionId("ONVOPI:pi_1")).thenReturn(Optional.of(sesion));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.DESCONOCIDO);
        assertThat(service.confirmarSinpeOnvoPorWebhook("pi_1")).isFalse();
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("ALTO 3: el sondeo con ONVO pagado no cierra la venta ni expira, aunque esté vencida")
    void sondeoPagadoEsperaWebhook() {
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.PAGADO);
        assertThat(service.verificarEstado("tokensinpeonvo01")).isEqualTo("PENDIENTE");
        verify(completionService, never()).completarVentaTarjeta(any());
        verify(sinpeOnvo, never()).cancelarIntent(any());
        verify(posQrRepo, never()).reclamarParaCompletar(any());
    }

    @Test
    @DisplayName("ALTO 3: solo el webhook verificado por GET cierra la venta")
    void webhookPagadoCierra() {
        when(posQrRepo.findByStripeSessionId("ONVOPI:pi_1")).thenReturn(Optional.of(sesion));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.PAGADO);
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(1);
        assertThat(service.confirmarSinpeOnvoPorWebhook("pi_1")).isTrue();
        verify(completionService).completarVentaTarjeta(sesion);
    }

    @Test
    @DisplayName("Idempotencia: el webhook registra su eventId y un reenvío del mismo evento no reprocesa")
    void webhookEventIdIdempotente() {
        sesion.setId(31L);
        when(posQrRepo.findByStripeSessionId("ONVOPI:pi_1")).thenReturn(Optional.of(sesion));
        when(sinpeOnvo.estadoIntent(sesion)).thenReturn(PosSinpeOnvoService.EstadoIntent.PAGADO);
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(1);
        assertThat(service.confirmarSinpeOnvoPorWebhook("pi_1", "evt_1")).isTrue();
        verify(posQrRepo).registrarEventoOnvo(sesion.getId(), "evt_1");

        org.mockito.Mockito.clearInvocations(posQrRepo, sinpeOnvo, completionService);
        when(posQrRepo.existsByOnvoEventoId("evt_1")).thenReturn(true);
        assertThat(service.confirmarSinpeOnvoPorWebhook("pi_1", "evt_1")).isTrue();
        verify(sinpeOnvo, never()).estadoIntent(any());
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("REEMBOLSO_PENDIENTE es terminal: no se expira, no se cierra como venta y el webhook repetido no la toca")
    void reembolsoPendienteNoEsVenta() {
        sesion.setEstado(com.hotclick.model.PosQrSesion.ESTADO_REEMBOLSO_PENDIENTE);
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        assertThat(service.verificarEstado("tokensinpeonvo01")).isEqualTo(com.hotclick.model.PosQrSesion.ESTADO_REEMBOLSO_PENDIENTE);
        when(posQrRepo.findByStripeSessionId("ONVOPI:pi_1")).thenReturn(Optional.of(sesion));
        assertThat(service.confirmarSinpeOnvoPorWebhook("pi_1")).isTrue();
        verify(sinpeOnvo, never()).estadoIntent(any());
        verify(posQrRepo, never()).reclamarParaCompletar(any());
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Webhook de un intent que no es del POS: ignorado")
    void webhookAjeno() {
        when(posQrRepo.findByStripeSessionId("ONVOPI:pi_x")).thenReturn(Optional.empty());
        assertThat(service.confirmarSinpeOnvoPorWebhook("pi_x")).isFalse();
    }


}
