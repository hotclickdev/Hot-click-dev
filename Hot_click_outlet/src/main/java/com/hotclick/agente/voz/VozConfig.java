package com.hotclick.agente.voz;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Set;

/** Límites y costo de las notas de voz (propiedades {@code agente.voz.*}). */
@Component
public class VozConfig {

    /** Tipos MIME aceptados (sin parámetros). WhatsApp envía audio/ogg (opus); IG y Messenger, audio/mp4 o similar. */
    static final Set<String> MIME_PERMITIDOS = Set.of("audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac",
        "audio/amr", "audio/wav", "audio/x-wav", "audio/webm");

    private final long maxBytes;
    private final int maxSegundos;
    private final int timeoutSegundos;
    private final double costoUsdPorMinuto;

    public VozConfig(@Value("${agente.voz.max-bytes:16777216}") long maxBytes,
                     @Value("${agente.voz.max-segundos:120}") int maxSegundos,
                     @Value("${agente.voz.timeout-segundos:20}") int timeoutSegundos,
                     @Value("${agente.voz.costo-usd-por-minuto:0}") double costoUsdPorMinuto) {
        this.maxBytes = Math.max(1024, maxBytes);
        this.maxSegundos = Math.max(1, maxSegundos);
        this.timeoutSegundos = Math.max(1, timeoutSegundos);
        this.costoUsdPorMinuto = Math.max(0, costoUsdPorMinuto);
    }

    public long maxBytes() { return maxBytes; }
    public int maxSegundos() { return maxSegundos; }
    public int timeoutSegundos() { return timeoutSegundos; }
    public double costoUsdPorMinuto() { return costoUsdPorMinuto; }
}
