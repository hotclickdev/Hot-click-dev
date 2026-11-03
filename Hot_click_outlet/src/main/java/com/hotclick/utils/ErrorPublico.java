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
 *       desde código de {@code com.hotclick.*} (el primer frame de la traza es nuestro, sin saltar proxies). Las que lanzan
 *       Spring, Hibernate, Jackson o el JDK (p. ej. {@code NumberFormatException}) llevan texto interno y
 *       salen genéricas; sin traza disponible también (falla cerrado).</li>
 * </ul>
 * Una excepción con {@code getCause() != null} es siempre genérica (suele copiar el texto de una librería) y
 * un {@link Error} (OutOfMemoryError…) también. Aun siendo propia, un texto largo o con pinta de interno
 * (SQL, tablas, JDBC, URLs, host:puerto, dominios, IPs, rutas de archivo) se reemplaza. Todo lo demás
 * responde {@link #GENERICO} y el detalle queda solo en el log.
 *
 * <p><b>Convención:</b> al envolver o relanzar un error no hagas {@code new IllegalStateException(e.getMessage())} sin
 * pasar la causa: el texto de una librería (SQL, host, ruta) quedaría como si fuera propio y el primer frame de la traza
 * sería nuestro. Usá {@code new IllegalStateException("texto propio y seguro", e)}: con {@code getCause() != null}
 * la respuesta siempre es genérica y el detalle va solo al log.
 */
public final class ErrorPublico {

    public static final String GENERICO = "No pudimos completar la operación. Intentá de nuevo en unos minutos.";
    private static final Logger log = LoggerFactory.getLogger(ErrorPublico.class);

    private ErrorPublico() {}

    public static String mensaje(Throwable e) {
        String msg = e != null ? e.getMessage() : null;
        if (esPropia(e) && msg != null && !msg.isBlank() && msg.length() <= MAX_LARGO_ANALISIS && !pareceInterno(msg)) {
            return msg;
        }
        log.error("[error-no-publico] {}: {}", e != null ? e.getClass().getSimpleName() : "null", msg, e);
        return GENERICO;
    }

    /** True si el mensaje lo escribimos nosotros (lista blanca); ver la documentación de la clase. */
    static boolean esPropia(Throwable e) {
        if (e == null || e instanceof Error) return false; // OutOfMemoryError, StackOverflowError…: nunca
        // Con causa, el texto suele copiar el de una librería ("Error: " + ex.getMessage()): genérico, como en
        // GlobalExceptionHandler (IllegalStateException con causa = 500).
        if (e.getCause() != null) return false;
        if (e instanceof MensajePublicoSeguro || e.getClass().getName().startsWith("com.hotclick.exception.")) {
            return true;
        }
        boolean validacion = e instanceof IllegalArgumentException || e instanceof IllegalStateException
            || e instanceof SecurityException;
        if (!validacion) return false;
        if (e.getClass().getName().startsWith("com.hotclick.")) return true; // subclase nuestra
        // Sitio del throw: el primer frame debe ser nuestro (sin saltar proxies). Sin traza = falla cerrado.
        StackTraceElement[] traza = e.getStackTrace();
        return traza.length > 0 && traza[0].getClassName().startsWith("com.hotclick.");
    }

    private static final java.util.regex.Pattern URL = java.util.regex.Pattern.compile("(?i)\\b[a-z][a-z0-9+.-]*://|\\bwww\\.");
    private static final java.util.regex.Pattern HOST_PUERTO = java.util.regex.Pattern.compile("(?i)\\b[a-z][a-z0-9_.-]*:\\d{2,5}\\b");
    private static final java.util.regex.Pattern DOMINIO = java.util.regex.Pattern.compile(
        "(?i)[a-z0-9-]\\.(?:com|lat|net|org|io|dev|app|cloud|internal|local|info|biz|co|cr|xyz|es|me|corp)\\b");
    /** {@code localhost} y hosts con pinta de red interna ({@code internal-db}, {@code svc-pagos}…), con o sin dominio. */
    private static final java.util.regex.Pattern HOST_INTERNO = java.util.regex.Pattern.compile(
        "(?i)\\blocalhost\\b|\\b(?:internal|intranet|private|priv|prod|staging|db|redis|svc)-[a-z0-9][a-z0-9-]*");
    private static final java.util.regex.Pattern IP = java.util.regex.Pattern.compile("\\b\\d{1,3}(\\.\\d{1,3}){3}\\b|\\[?[0-9a-fA-F]{0,4}(:[0-9a-fA-F]{0,4}){3,7}\\]?");
    private static final java.util.regex.Pattern RUTA = java.util.regex.Pattern.compile(
        "(?:^|[\\s(\\[\"'=:])/[A-Za-z0-9_.~-]+|\\b[A-Za-z]:\\\\|\\\\\\\\[A-Za-z0-9_.$-]+|(?i)\\bfile:");

    /**
     * Tope propio de {@link #pareceInterno}: las regex de arriba pueden ser cuadráticas con entradas largas, así que no
     * dependen de que quien llama ya haya cortado el largo (como hace {@link #mensaje}). Un texto más largo que esto
     * se trata como interno (nunca se muestra), sin pasarlo por las regex.
     */
    static final int MAX_LARGO_ANALISIS = 300;

    static boolean pareceInterno(String msg) {
        if (msg.length() > MAX_LARGO_ANALISIS) return true;
        String m = msg.toLowerCase(java.util.Locale.ROOT);
        return m.contains("sql") || m.contains("hot_click_") || m.contains("exception") || m.contains("jdbc")
            || m.contains("constraint") || m.contains("could not execute")
            || m.contains("outofmemory") || m.contains("java heap") || m.contains("gc overhead")
            || m.contains("stackoverflow") || m.contains("java.lang.") || m.contains("org.springframework")
            || URL.matcher(msg).find() || HOST_PUERTO.matcher(msg).find() || DOMINIO.matcher(msg).find()
            || HOST_INTERNO.matcher(msg).find() || IP.matcher(msg).find() || RUTA.matcher(msg).find();
    }
}
