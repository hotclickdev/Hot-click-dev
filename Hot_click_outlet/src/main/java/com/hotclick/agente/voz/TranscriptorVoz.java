package com.hotclick.agente.voz;

/**
 * Punto de extensión para transcribir notas de voz. La implementación activa se elige con la propiedad
 * {@code agente.voz.proveedor} (vacía = {@link TranscriptorDeshabilitado}). Un proveedor nuevo es un bean con
 * {@code @ConditionalOnProperty(name = "agente.voz.proveedor", havingValue = "<nombre>")}.
 *
 * <p>Reglas para quien implemente: timeout en toda llamada externa, el audio no se guarda en disco ni se registra
 * (ni su contenido ni quién lo envió), secretos solo por variables de entorno, y cualquier fallo se expresa con
 * {@link TranscripcionException} (sin texto del audio en el mensaje).
 */
public interface TranscriptorVoz {

    /** false = no hay proveedor: el bot pide al cliente que escriba. */
    boolean habilitado();

    /** @throws TranscripcionException si el proveedor falla, no responde o no entiende el audio */
    ResultadoVoz transcribir(AudioVoz audio);
}
