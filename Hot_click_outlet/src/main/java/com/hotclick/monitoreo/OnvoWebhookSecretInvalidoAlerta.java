package com.hotclick.monitoreo;

import com.hotclick.service.TelegramService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * INF-03: cuenta los 401 del webhook ONVO por secret inválido y avisa a Telegram cuando superan un umbral
 * dentro de una ventana. Apagado por defecto (umbral 0). El aviso nunca incluye el secret, IPs ni datos del cuerpo.
 * Tras avisar, no vuelve a avisar hasta que pase una ventana completa (evita inundar el canal).
 */
@Component
public class OnvoWebhookSecretInvalidoAlerta {

    private final TelegramService telegram;
    private final int umbral;
    private final long ventanaMs;
    private final Clock clock;
    private final Deque<Long> fallos = new ArrayDeque<>();
    private long ultimoAviso = Long.MIN_VALUE;

    @Autowired
    public OnvoWebhookSecretInvalidoAlerta(TelegramService telegram,
            @Value("${onvo.alertas.webhook-secret-invalido.umbral:0}") int umbral,
            @Value("${onvo.alertas.webhook-secret-invalido.ventana-minutos:10}") int ventanaMinutos) {
        this(telegram, umbral, ventanaMinutos, Clock.systemUTC());
    }

    OnvoWebhookSecretInvalidoAlerta(TelegramService telegram, int umbral, int ventanaMinutos, Clock clock) {
        this.telegram = telegram;
        this.umbral = Math.max(0, umbral);
        this.ventanaMs = Math.max(1, ventanaMinutos) * 60_000L;
        this.clock = clock;
    }

    public boolean activa() { return umbral > 0 && telegram != null; }

    /** Registra un fallo; devuelve true si en esta llamada se disparó el aviso. */
    public synchronized boolean registrarFallo() {
        if (!activa()) return false;
        long ahora = clock.millis();
        fallos.addLast(ahora);
        while (!fallos.isEmpty() && fallos.peekFirst() <= ahora - ventanaMs) fallos.removeFirst();
        if (fallos.size() <= umbral) return false;
        if (ultimoAviso != Long.MIN_VALUE && ahora - ultimoAviso < ventanaMs) return false;
        ultimoAviso = ahora;
        long min = ventanaMs / 60_000L;
        telegram.enviar("⚠️ Webhook ONVO: " + fallos.size() + " intentos con secret inválido (401) en "
            + min + " min (umbral " + umbral + "). Revisá el secret configurado o un posible ataque.");
        return true;
    }
}
