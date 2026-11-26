package com.hotclick.agente.asesor;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Detecta, sin llamar a ningún modelo, si un mensaje del chat pide una ACCIÓN del asesor (carrito o estado de un
 * pedido). Solo esos mensajes se enrutan al motor con tools; el resto sigue por el pipeline de descubrimiento.
 */
public final class AsesorIntencion {

    private AsesorIntencion() {}

    private static final List<String> CARRITO = List.of(
        "carrito", "agregal", "agrega ", "agregar", "anadir", "anade", "ponelo", "ponlo en", "me lo llevo",
        "lo quiero", "lo compro", "add to cart", "add it", "cart");
    private static final List<String> PEDIDO = List.of(
        "mi pedido", "mi orden", "estado del pedido", "estado de mi", "donde esta mi", "donde va mi", "rastre",
        "seguimiento de", "numero de guia", "mi compra", "my order", "order status", "track my", "tracking");
    private static final Pattern NUMERO_PEDIDO = Pattern.compile("\\b(ord|hc)-[a-z0-9]{4,}\\b");

    public static boolean detecta(String mensaje) {
        if (mensaje == null || mensaje.isBlank()) return false;
        String m = " " + normalizar(mensaje) + " ";
        return contiene(m, CARRITO) || contiene(m, PEDIDO) || NUMERO_PEDIDO.matcher(m).find();
    }

    private static boolean contiene(String m, List<String> claves) {
        for (String c : claves) {
            if (m.contains(c)) return true;
        }
        return false;
    }

    static String normalizar(String s) {
        String sin = Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sin.replace('ñ', 'n');
    }
}
