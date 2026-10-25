package com.hotclick.monitoreo;

import com.hotclick.service.TelegramService;
import io.sentry.Sentry;
import io.sentry.SentryLevel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * INF-03: reporta a Sentry las respuestas anómalas del webhook ONVO (401, 409, 503 y 5xx)
 * y avisa por Telegram cuando en la ventana se supera el umbral. Sin PII: solo código y tipo de evento.
 * Pensado para que OnvoWebhookController llame a {@link #registrarRespuesta} antes de devolver
 * y a {@link #registrarExcepcion} en su catch (antes de relanzar).
 */
@Component
public class OnvoWebhookAlertas {

    /** Puerto hacia Sentry, sustituible en pruebas. */
    interface SentryPort {
        void mensaje(String texto, String tagResultado);
    }

    private final TelegramService telegram;
    private final int umbral;
    private final long ventanaMs;
    private final Clock clock;
    private SentryPort sentry = (texto, tag) -> Sentry.withScope(scope -> {
        scope.setTag("onvo_webhook", tag);
        scope.setLevel(SentryLevel.ERROR);
        Sentry.captureMessage(texto);
    });
    private final Deque<Long> fallos = new ArrayDeque<>();
    private long ultimoAvisoMs = Long.MIN_VALUE;

    @org.springframework.beans.factory.annotation.Autowired
    public OnvoWebhookAlertas(TelegramService telegram,
                              @Value("${onvo.alertas.umbral:3}") int umbral,
                              @Value("${onvo.alertas.ventana-minutos:10}") int ventanaMinutos) {
        this(telegram, umbral, ventanaMinutos, Clock.systemUTC());
    }

    OnvoWebhookAlertas(TelegramService telegram, int umbral, int ventanaMinutos, Clock clock) {
        this.telegram = telegram;
        this.umbral = Math.max(1, umbral);
        this.ventanaMs = Math.max(1, ventanaMinutos) * 60_000L;
        this.clock = clock;
    }

    void setSentry(SentryPort sentry) { this.sentry = sentry; }

    static boolean esAlertable(int status) {
        return status == 401 || status == 409 || status == 503 || status >= 500;
    }

    /** Llamar con el código HTTP que el webhook va a devolver. */
    public void registrarRespuesta(int status, String tipoEvento) {
        if (!esAlertable(status)) return;
        sentry.mensaje("ONVO webhook respondió " + status + " (" + seguro(tipoEvento) + ")", String.valueOf(status));
        contar(status);
    }

    /**
     * Llamar en el catch antes de relanzar: la excepción relanzada la captura Sentry
     * (GlobalExceptionHandler), aquí solo se cuenta para el umbral de Telegram.
     */
    public void registrarExcepcion(String tipoEvento) {
        contar(500);
    }

    private synchronized void contar(int status) {
        long ahora = clock.millis();
        fallos.addLast(ahora);
        while (!fallos.isEmpty() && fallos.peekFirst() <= ahora - ventanaMs) fallos.removeFirst();
        if (fallos.size() >= umbral && (ultimoAvisoMs == Long.MIN_VALUE || ahora - ultimoAvisoMs >= ventanaMs)) {
            ultimoAvisoMs = ahora;
            telegram.enviar("⚠️ Webhook ONVO: " + fallos.size() + " respuestas de error (última " + status
                + ") en " + (ventanaMs / 60_000) + " min. Revisar Sentry.");
        }
    }

    private static String seguro(String tipo) {
        if (tipo == null) return "-";
        String t = tipo.replaceAll("[^a-zA-Z0-9._-]", "");
        return t.substring(0, Math.min(t.length(), 60));
    }
}
