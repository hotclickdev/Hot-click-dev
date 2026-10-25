package com.hotclick.monitoreo;

import com.hotclick.service.TelegramService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class OnvoWebhookAlertasTest {

    TelegramService telegram = mock(TelegramService.class);
    AtomicLong ahora = new AtomicLong(1_000_000L);
    List<String> tags = new ArrayList<>();
    OnvoWebhookAlertas alertas;

    @BeforeEach
    void armar() {
        Clock clock = new Clock() {
            public ZoneOffset getZone() { return ZoneOffset.UTC; }
            public Clock withZone(java.time.ZoneId z) { return this; }
            public Instant instant() { return Instant.ofEpochMilli(ahora.get()); }
        };
        alertas = new OnvoWebhookAlertas(telegram, 3, 10, clock);
        alertas.setSentry((texto, tag) -> tags.add(tag));
    }

    @Test
    void reportaASentry401_409_503y5xx_peroNo200ni404() {
        for (int s : new int[]{200, 400, 404, 413, 429}) alertas.registrarRespuesta(s, "x");
        assertThat(tags).isEmpty();
        for (int s : new int[]{401, 409, 503, 500}) alertas.registrarRespuesta(s, "checkout-session.succeeded");
        assertThat(tags).containsExactly("401", "409", "503", "500");
    }

    @Test
    void telegramSoloAlSuperarUmbralYUnaVezPorVentana() {
        alertas.registrarRespuesta(401, "a");
        alertas.registrarRespuesta(401, "a");
        verify(telegram, never()).enviar(anyString());
        alertas.registrarExcepcion("a");
        verify(telegram, times(1)).enviar(anyString());
        alertas.registrarRespuesta(503, "a");
        verify(telegram, times(1)).enviar(anyString());
    }

    @Test
    void fallosFueraDeLaVentanaNoCuentan() {
        alertas.registrarRespuesta(401, "a");
        alertas.registrarRespuesta(401, "a");
        ahora.addAndGet(11 * 60_000L);
        alertas.registrarRespuesta(401, "a");
        verify(telegram, never()).enviar(anyString());
    }

    @Test
    void excepcionNoDuplicaEventoEnSentry() {
        alertas.registrarExcepcion("a");
        assertThat(tags).isEmpty();
    }
}
