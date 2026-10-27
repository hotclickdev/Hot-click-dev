package com.hotclick.security;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Ruta canónica para decidir límites por ruta (RateLimitingFilter).
 *
 * <p>El contenedor entrega {@code getRequestURI()} SIN decodificar, pero Spring MVC enruta sobre la ruta
 * decodificada y sin parámetros de ruta. Comparar la URI cruda con las claves del filtro dejaba evadir el tope
 * escribiendo {@code /api/gift-cards/%76alidar} (o {@code ;x}, {@code //}, {@code /./}) y llegar igual al
 * controlador. Aquí se reproduce el mismo saneo y, ante la duda, se cuenta contra el cupo (fail-closed):
 * <ol>
 *   <li>quita parámetros de ruta ({@code ;jsessionid=..., ;x}) de cada segmento,</li>
 *   <li>decodifica porcentajes (mayúsculas o minúsculas) hasta que la ruta ya no cambie, con tope de
 *       {@link #MAX_DECODIFICACIONES}: el doble encoding cae en el mismo cupo que la ruta plana,</li>
 *   <li>colapsa barras repetidas, resuelve {@code .} y {@code ..} (sin salir de la raíz) y quita la barra final,</li>
 *   <li>quita el context path.</li>
 * </ol>
 * Devuelve {@code null} si la ruta es inválida (porcentaje mal formado, UTF-8 inválido, caracteres de control
 * o más decodificaciones que el tope): el filtro responde 400 y no deja pasar la petición.
 */
public final class RutaCanonica {

    /** Niveles de encoding que se deshacen; más que esto se rechaza (400). */
    static final int MAX_DECODIFICACIONES = 3;

    private RutaCanonica() {}

    /** @return ruta canónica sin context path (siempre empieza con «/»), o {@code null} si es inválida. */
    public static String de(String requestUri, String contextPath) {
        String ruta = canonizar(requestUri);
        if (ruta == null) return null;
        if (contextPath != null && !contextPath.isEmpty()) {
            String ctx = canonizar(contextPath);
            if (ctx == null) return null;
            if (!ctx.equals("/")) {
                if (ruta.equals(ctx)) return "/";
                if (ruta.startsWith(ctx + "/")) ruta = ruta.substring(ctx.length());
            }
        }
        return ruta;
    }

    private static String canonizar(String uri) {
        if (uri == null || uri.isEmpty()) return "/";
        // Sin query ni fragmento (getRequestURI no los trae; por si se llama con una URI completa).
        int corte = indiceDeCorte(uri);
        String actual = quitarParametrosDeRuta(corte >= 0 ? uri.substring(0, corte) : uri);
        for (int i = 0; ; i++) {
            if (actual.indexOf('%') < 0) break;
            if (i >= MAX_DECODIFICACIONES) return null;
            String decodificada = decodificar(actual);
            if (decodificada == null) return null;
            // %3B decodifica a «;»: también cuenta como parámetro de ruta (fail-closed hacia el cupo).
            actual = quitarParametrosDeRuta(decodificada);
        }
        if (tieneControl(actual)) return null;
        return normalizar(actual);
    }

    private static int indiceDeCorte(String uri) {
        for (int i = 0; i < uri.length(); i++) {
            char c = uri.charAt(i);
            if (c == '?' || c == '#') return i;
        }
        return -1;
    }

    /** Quita «;...» hasta la siguiente «/» (o el final) en cada segmento. */
    private static String quitarParametrosDeRuta(String ruta) {
        if (ruta.indexOf(';') < 0) return ruta;
        StringBuilder sb = new StringBuilder(ruta.length());
        boolean omitiendo = false;
        for (int i = 0; i < ruta.length(); i++) {
            char c = ruta.charAt(i);
            if (c == ';') { omitiendo = true; continue; }
            if (c == '/') omitiendo = false;
            if (!omitiendo) sb.append(c);
        }
        return sb.toString();
    }

    /** Decodifica «%XX» como UTF-8 estricto; {@code null} si el porcentaje o el UTF-8 son inválidos. */
    private static String decodificar(String s) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '%') {
                if (i + 2 >= s.length()) return null;
                int hi = Character.digit(s.charAt(i + 1), 16);
                int lo = Character.digit(s.charAt(i + 2), 16);
                if (hi < 0 || lo < 0) return null;
                bytes.write((hi << 4) | lo);
                i += 2;
            } else {
                int cp = s.codePointAt(i);
                byte[] b = new String(Character.toChars(cp)).getBytes(StandardCharsets.UTF_8);
                bytes.write(b, 0, b.length);
                i += Character.charCount(cp) - 1;
            }
        }
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes.toByteArray()))
                    .toString();
        } catch (CharacterCodingException e) {
            return null;
        }
    }

    private static boolean tieneControl(String s) {
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c < 0x20 || c == 0x7f || c == '\\') return true;
        }
        return false;
    }

    /** Colapsa «//», resuelve «.» y «..» sin salir de la raíz y quita la barra final. */
    private static String normalizar(String ruta) {
        Deque<String> pila = new ArrayDeque<>();
        for (String seg : ruta.split("/", -1)) {
            if (seg.isEmpty() || seg.equals(".")) continue;
            if (seg.equals("..")) {
                if (!pila.isEmpty()) pila.removeLast();
                continue;
            }
            pila.addLast(seg);
        }
        if (pila.isEmpty()) return "/";
        StringBuilder sb = new StringBuilder();
        for (String seg : pila) sb.append('/').append(seg);
        return sb.toString();
    }
}
