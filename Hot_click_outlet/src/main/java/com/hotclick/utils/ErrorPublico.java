package com.hotclick.utils;

import com.hotclick.exception.MensajePublicoSeguro;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ESC-3: qué texto de una excepción puede ver el cliente. Es una lista blanca: solo se muestra el mensaje de
 * excepciones PROPIAS, es decir:
 * <ul>
 *   <li>las de {@code com.hotclick.exception.*} y las marcadas con {@link MensajePublicoSeguro};</li>
 *   <li>{@link IllegalArgumentException}, {@link IllegalStateException} y {@link SecurityException} lanzadas
 *       desde código de {@code com.hotclick.*} (el primer frame de la traza, saltando proxies/transacciones/reflexión,
 *       es nuestro). Las que lanzan
 *       Spring, Hibernate, Jackson o el JDK (p. ej. {@code NumberFormatException}) llevan texto interno y
 *       salen genéricas; sin traza disponible también (falla cerrado).</li>
 * </ul>
 * Aun siendo propia, un texto largo o con pinta de interno (SQL, tablas, JDBC) se reemplaza. Todo lo demás
 * responde {@link #GENERICO} y el detalle queda solo en el log.
 */
public final class ErrorPublico {

    public static final String GENERICO = "No pudimos completar la operación. Intentá de nuevo en unos minutos.";
    private static final Logger log = LoggerFactory.getLogger(ErrorPublico.class);

    private ErrorPublico() {}

    public static String mensaje(Throwable e) {
        String msg = e != null ? e.getMessage() : null;
        if (esPropia(e) && msg != null && !msg.isBlank() && msg.length() <= 300 && !pareceInterno(msg)) {
            return msg;
        }
        log.error("[error-no-publico] {}: {}", e != null ? e.getClass().getSimpleName() : "null", msg, e);
        return GENERICO;
    }

    /** True si el mensaje lo escribimos nosotros (lista blanca); ver la documentación de la clase. */
    static boolean esPropia(Throwable e) {
        if (e == null) return false;
        if (e instanceof MensajePublicoSeguro || e.getClass().getName().startsWith("com.hotclick.exception.")) {
            return true;
        }
        boolean validacion = e instanceof IllegalArgumentException || e instanceof IllegalStateException
            || e instanceof SecurityException;
        if (!validacion) return false;
        if (e.getClass().getName().startsWith("com.hotclick.")) return true; // subclase nuestra
        for (StackTraceElement frame : e.getStackTrace()) {
            String clase = frame.getClassName();
            if (esInfraestructuraDeProxy(clase)) continue; // proxies/reflexión: no son el sitio del throw
            return clase.startsWith("com.hotclick.");
        }
        return false; // sin traza: falla cerrado
    }

    /** Frames de proxies, transacciones y reflexión que pueden quedar arriba de la traza sin ser el origen. */
    private static boolean esInfraestructuraDeProxy(String clase) {
        return clase.startsWith("org.springframework.aop.") || clase.startsWith("org.springframework.cglib.")
            || clase.startsWith("org.springframework.transaction.interceptor.")
            || clase.startsWith("org.mockito.") || clase.startsWith("net.bytebuddy.")
            || clase.startsWith("jdk.internal.reflect.") || clase.startsWith("java.lang.reflect.");
    }

    private static boolean pareceInterno(String msg) {
        String m = msg.toLowerCase(java.util.Locale.ROOT);
        return m.contains("sql") || m.contains("hot_click_") || m.contains("exception") || m.contains("jdbc")
            || m.contains("constraint") || m.contains("could not execute");
    }
}
