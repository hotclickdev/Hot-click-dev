package com.hotclick.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import org.springframework.web.client.HttpStatusCodeException;

/**
 * Traduce fallos de ONVO / Resilience4j a excepciones de negocio.
 * El fallback del circuit breaker no debe tapar un 400 de validación.
 */
final class OnvoErrorSupport {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private OnvoErrorSupport() {}

    static String mensajeCliente(HttpStatusCodeException e) {
        String extraido = extraerMensajeJson(e.getResponseBodyAsString());
        if (extraido != null && !extraido.isBlank()) {
            return extraido;
        }
        return "ONVO rechazó el pago (" + e.getStatusCode().value() + ")";
    }

    static String extraerMensajeJson(String body) {
        if (body == null || body.isBlank()) return null;
        try {
            JsonNode message = MAPPER.readTree(body).get("message");
            if (message == null || message.isNull()) return null;
            if (message.isArray() && !message.isEmpty()) {
                return message.get(0).asText();
            }
            return message.isTextual() ? message.asText() : null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    static RuntimeException relanzar(Throwable t) {
        if (t instanceof CallNotPermittedException) {
            return new IllegalStateException("Servicio de pagos no disponible temporalmente");
        }
        if (t instanceof RuntimeException re) {
            return re;
        }
        return new IllegalStateException(t.getMessage(), t);
    }
}
