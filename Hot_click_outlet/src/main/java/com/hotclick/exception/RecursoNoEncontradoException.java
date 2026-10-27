package com.hotclick.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.NoSuchElementException;

/**
 * Recurso inexistente (404). El mensaje ({@link #getMessage()}) llega al cliente, así que NO debe llevar datos
 * de dentro (correos, tokens, planes o tipos de configuración, números de pedido...). Lo que sirva para
 * diagnosticar va en el detalle, que solo se escribe en el log del servidor ({@link #conDetalle}).
 *
 * <p>En el constructor {@code (entidad, id)} el id solo se muestra si es numérico (el id que el propio cliente
 * mandó en la URL o el cuerpo, sin diferencia entre ajeno e inexistente); un id de texto (correo, token, id
 * externo) se omite del mensaje y no se escribe en el log.
 */
public class RecursoNoEncontradoException extends NoSuchElementException {

    private static final Logger log = LoggerFactory.getLogger(RecursoNoEncontradoException.class);

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }

    /** Con causa técnica: el mensaje no se toca y la causa solo viaja en la excepción (nunca al cliente). */
    public RecursoNoEncontradoException(String mensaje, Throwable causa) {
        super(mensaje);
        initCause(causa);
    }

    public RecursoNoEncontradoException(String entidad, Object id) {
        super(id instanceof Number ? entidad + " no encontrado: " + id : entidad + " no encontrado");
    }

    /**
     * Mensaje genérico para el cliente y detalle solo para el log del servidor. El detalle debe venir ya sin
     * PII (sin correos ni teléfonos; usar {@link #enmascarar(String)} para números de pedido).
     */
    public static RecursoNoEncontradoException conDetalle(String mensajePublico, String detalleLog) {
        log.warn("[no-encontrado] {} (detalle interno: {})", mensajePublico, detalleLog);
        return new RecursoNoEncontradoException(mensajePublico);
    }

    /** Deja solo los últimos 4 caracteres: {@code ***1234}. Nulo o corto: {@code ***}. */
    public static String enmascarar(String valor) {
        if (valor == null || valor.length() <= 4) return "***";
        return "***" + valor.substring(valor.length() - 4).replaceAll("[^A-Za-z0-9_-]", "?");
    }
}
