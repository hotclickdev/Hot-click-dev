package com.hotclick.service.whatsapp;

import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-05: la ventana de 24 h sale del último mensaje del cliente en sus conversaciones de WhatsApp. */
class VentanaServicioWhatsAppRealTest {

    private static final Instant AHORA = Instant.parse("2026-11-24T12:00:00Z");

    private final ConversacionSesionRepository sesiones = mock(ConversacionSesionRepository.class);
    private final VentanaServicioWhatsAppReal ventana =
        new VentanaServicioWhatsAppReal(sesiones, Clock.fixed(AHORA, ZoneOffset.UTC));

    @Test
    void consultaElCanalWhatsappConElTelefonoNormalizadoYElLimiteDe24Horas() {
        when(sesiones.existsByCanalAndContactoExternoAndUltimoMensajeClienteAfter(
            "WHATSAPP", "50688881234", AHORA.minusSeconds(24 * 3600))).thenReturn(true);

        assertThat(ventana.dentroDeVentana("8888-1234")).isTrue();
        assertThat(ventana.dentroDeVentana("+506 8888 1234")).isTrue();
    }

    @Test
    void sinMensajeReciente_estaFueraDeVentana() {
        when(sesiones.existsByCanalAndContactoExternoAndUltimoMensajeClienteAfter(anyString(), anyString(), any()))
            .thenReturn(false);

        assertThat(ventana.dentroDeVentana("50688881234")).isFalse();
        verify(sesiones).existsByCanalAndContactoExternoAndUltimoMensajeClienteAfter(
            eq("WHATSAPP"), eq("50688881234"), eq(AHORA.minusSeconds(24 * 3600)));
    }

    @Test
    void telefonoVacioONuloNoConsultaLaBase() {
        assertThat(ventana.dentroDeVentana(null)).isFalse();
        assertThat(ventana.dentroDeVentana("  ")).isFalse();
        verify(sesiones, never()).existsByCanalAndContactoExternoAndUltimoMensajeClienteAfter(any(), any(), any());
    }
}
