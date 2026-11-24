package com.hotclick.agente.motor;

/**
 * Puerto HTTP hacia la Messages API de Claude (se mockea en las pruebas; nunca se llama a la API real en tests).
 * La implementación lanza {@link com.hotclick.exception.IntegracionExternaException} en fallos transitorios
 * (timeout, IO, 429, 5xx) para que el circuit breaker {@code claude} los cuente; el resto de códigos HTTP se
 * devuelve como {@link RespuestaClaude}.
 */
public interface ClienteClaude {

    RespuestaClaude enviar(String cuerpoJson);

    /** Respuesta HTTP cruda. */
    record RespuestaClaude(int status, String cuerpo) {}
}
