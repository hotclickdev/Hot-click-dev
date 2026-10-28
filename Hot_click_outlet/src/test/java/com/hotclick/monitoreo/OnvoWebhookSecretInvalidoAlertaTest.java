package com.hotclick.monitoreo;

import com.hotclick.service.TelegramService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@DisplayName("INF-03 | umbral de 401 del webhook ONVO → Telegram")
class OnvoWebhookSecretInvalidoAlertaTest {

    private final AtomicLong ms = new AtomicLong(1_000_000_000L);
    private final Clock clock = new Clock() {
        public ZoneOffset getZone() { return ZoneOffset.UTC; }
        public Clock withZone(java.time.ZoneId z) { return this; }
        public Instant instant() { return Instant.ofEpochMilli(ms.get()); }
    };

    @Test
    @DisplayName("Umbral 0 (por defecto) → apagado, nunca avisa")
    void apagadoPorDefecto() {
        TelegramService t = mock(TelegramService.class);
        var a = new OnvoWebhookSecretInvalidoAlerta(t, 0, 10, clock);
        for (int i = 0; i < 100; i++) assertThat(a.registrarFallo()).isFalse();
        verifyNoInteractions(t);
    }

    @Test
    @DisplayName("Supera el umbral en la ventana → un solo aviso, sin repetir dentro de la ventana")
    void avisaUnaVez() {
        TelegramService t = mock(TelegramService.class);
        var a = new OnvoWebhookSecretInvalidoAlerta(t, 3, 10, clock);
        for (int i = 0; i < 3; i++) assertThat(a.registrarFallo()).isFalse();
        assertThat(a.registrarFallo()).isTrue();
        assertThat(a.registrarFallo()).isFalse();
        verify(t, times(1)).enviar(argThat(m -> m.contains("401") && m.contains("umbral 3")));
    }

    @Test
    @DisplayName("Fallos fuera de la ventana no cuentan")
    void ventanaDeslizante() {
        TelegramService t = mock(TelegramService.class);
        var a = new OnvoWebhookSecretInvalidoAlerta(t, 2, 1, clock);
        for (int i = 0; i < 5; i++) { a.registrarFallo(); ms.addAndGet(31_000); }
        verify(t, never()).enviar(anyString());
    }
}
