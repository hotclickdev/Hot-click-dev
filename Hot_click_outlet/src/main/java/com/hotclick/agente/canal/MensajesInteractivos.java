package com.hotclick.agente.canal;

import com.hotclick.agente.webhook.MensajeEntrante.Canal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Construye los cuerpos JSON de mensajes con foto, precio y botones por canal, y el respaldo en texto. Sin E/S. */
final class MensajesInteractivos {

    static final int WA_MAX_BOTONES = 3;
    static final int WA_MAX_FILAS = 10;
    static final int WA_MAX_ID_BOTON = 256;
    static final int WA_MAX_ID_FILA = 200;
    static final int MAX_TITULO_BOTON = 20;
    static final int WA_MAX_TITULO_FILA = 24;
    static final int WA_MAX_DESC_FILA = 72;
    static final int WA_MAX_CUERPO = 1024;
    static final int WA_MAX_CAPTION = 1024;
    static final int SOCIAL_MAX_TITULO = 80;
    static final int SOCIAL_MAX_PAYLOAD = 1000;
    static final int SOCIAL_MAX_BOTONES = 3;
    static final int SOCIAL_MAX_QUICK = 13;

    private MensajesInteractivos() {}

    /** Precio en colones, es-CR: "₡12.500" (sin decimales). */
    static String precioColones(BigDecimal precio) {
        DecimalFormatSymbols sym = new DecimalFormatSymbols(Locale.forLanguageTag("es-CR"));
        sym.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,##0", sym);
        BigDecimal p = precio == null ? BigDecimal.ZERO : precio.setScale(0, RoundingMode.HALF_UP);
        return "₡" + df.format(p);
    }

    static boolean imagenValida(String url) {
        return url != null && url.regionMatches(true, 0, "https://", 0, 8) && url.length() > 8;
    }

    static String recortar(String t, int max) {
        if (t == null) return "";
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }

    /** "Nombre\n₡precio" más descripción si cabe. */
    static String textoProducto(TarjetaProducto t, int max) {
        String base = t.nombre() + "\n" + precioColones(t.precio());
        if (t.descripcion() != null && !t.descripcion().isBlank()) base += "\n" + t.descripcion().trim();
        return recortar(base, max);
    }

    static List<Boton> botonesValidos(List<Boton> botones, int max) {
        List<Boton> out = new ArrayList<>();
        for (Boton b : botones) {
            if (b == null || b.id() == null || b.id().isBlank() || b.titulo() == null || b.titulo().isBlank()) continue;
            if (out.size() == max) break;
            out.add(b);
        }
        return out;
    }

    // ---------- WhatsApp ----------

    /** Solo imagen con pie (para canales/usos sin botones). */
    static Map<String, Object> waImagen(String to, TarjetaProducto t) {
        return Map.of("messaging_product", "whatsapp", "to", to, "type", "image",
            "image", Map.of("link", t.imagenUrl(), "caption", textoProducto(t, WA_MAX_CAPTION)));
    }

    static Map<String, Object> waProducto(String to, TarjetaProducto t) {
        Map<String, Object> inter = waBotonesInteractive(textoProducto(t, WA_MAX_CUERPO), t.botonesEfectivos());
        if (imagenValida(t.imagenUrl()))
            inter.put("header", Map.of("type", "image", "image", Map.of("link", t.imagenUrl())));
        return waEnvoltorio(to, inter);
    }

    /** Mensaje interactivo de WhatsApp con un botón que abre una URL (cta_url). */
    static Map<String, Object> waBotonUrl(String to, String texto, String tituloBoton, String url) {
        Map<String, Object> inter = new LinkedHashMap<>();
        inter.put("type", "cta_url");
        inter.put("body", Map.of("text", recortar(texto, WA_MAX_CUERPO)));
        inter.put("action", Map.of("name", "cta_url",
            "parameters", Map.of("display_text", recortar(tituloBoton, MAX_TITULO_BOTON), "url", url)));
        return waEnvoltorio(to, inter);
    }

    static Map<String, Object> waBotones(String to, String texto, List<Boton> botones) {
        return waEnvoltorio(to, waBotonesInteractive(recortar(texto, WA_MAX_CUERPO), botones));
    }

    private static Map<String, Object> waBotonesInteractive(String cuerpo, List<Boton> botones) {
        List<Map<String, Object>> bs = new ArrayList<>();
        for (Boton b : botonesValidos(botones, WA_MAX_BOTONES))
            bs.add(Map.of("type", "reply", "reply",
                Map.of("id", recortarId(b.id(), WA_MAX_ID_BOTON), "title", recortar(b.titulo(), MAX_TITULO_BOTON))));
        Map<String, Object> inter = new LinkedHashMap<>();
        inter.put("type", "button");
        inter.put("body", Map.of("text", cuerpo));
        inter.put("action", Map.of("buttons", bs));
        return inter;
    }

    static Map<String, Object> waLista(String to, String texto, String textoBoton, List<FilaLista> filas) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (FilaLista f : filas) {
            if (f == null || f.id() == null || f.id().isBlank() || f.titulo() == null || f.titulo().isBlank()) continue;
            if (rows.size() == WA_MAX_FILAS) break;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", recortarId(f.id(), WA_MAX_ID_FILA));
            r.put("title", recortar(f.titulo(), WA_MAX_TITULO_FILA));
            if (f.descripcion() != null && !f.descripcion().isBlank())
                r.put("description", recortar(f.descripcion(), WA_MAX_DESC_FILA));
            rows.add(r);
        }
        String etiqueta = textoBoton == null || textoBoton.isBlank() ? "Ver opciones" : textoBoton;
        Map<String, Object> inter = new LinkedHashMap<>();
        inter.put("type", "list");
        inter.put("body", Map.of("text", recortar(texto, WA_MAX_CUERPO)));
        inter.put("action", Map.of("button", recortar(etiqueta, MAX_TITULO_BOTON),
            "sections", List.of(Map.of("title", "Opciones", "rows", rows))));
        return waEnvoltorio(to, inter);
    }

    private static Map<String, Object> waEnvoltorio(String to, Map<String, Object> interactive) {
        return Map.of("messaging_product", "whatsapp", "to", to, "type", "interactive", "interactive", interactive);
    }

    // ---------- Instagram y Messenger (Send API) ----------

    /** Generic template con una tarjeta: imagen, título (nombre), subtítulo (precio) y hasta 3 botones postback. */
    static Map<String, Object> socialProducto(String psid, TarjetaProducto t) {
        Map<String, Object> el = new LinkedHashMap<>();
        el.put("title", recortar(t.nombre(), SOCIAL_MAX_TITULO));
        String sub = precioColones(t.precio())
            + (t.descripcion() == null || t.descripcion().isBlank() ? "" : " · " + t.descripcion().trim());
        el.put("subtitle", recortar(sub, SOCIAL_MAX_TITULO));
        if (imagenValida(t.imagenUrl())) el.put("image_url", t.imagenUrl());
        List<Map<String, Object>> bs = new ArrayList<>();
        for (Boton b : botonesValidos(t.botonesEfectivos(), SOCIAL_MAX_BOTONES))
            bs.add(Map.of("type", "postback", "title", recortar(b.titulo(), MAX_TITULO_BOTON),
                "payload", recortarId(b.id(), SOCIAL_MAX_PAYLOAD)));
        el.put("buttons", bs);
        Map<String, Object> payload = Map.of("template_type", "generic", "elements", List.of(el));
        return socialEnvoltorio(psid, Map.of("attachment", Map.of("type", "template", "payload", payload)));
    }

    /** Texto con quick replies (hasta 13, título ≤ 20). */
    static Map<String, Object> socialQuickReplies(String psid, String texto, List<Boton> botones) {
        List<Map<String, Object>> qr = new ArrayList<>();
        for (Boton b : botonesValidos(botones, SOCIAL_MAX_QUICK))
            qr.add(Map.of("content_type", "text", "title", recortar(b.titulo(), MAX_TITULO_BOTON),
                "payload", recortarId(b.id(), SOCIAL_MAX_PAYLOAD)));
        return socialEnvoltorio(psid,
            Map.of("text", recortar(texto, MetaCanalMensajeria.MAX_SOCIAL), "quick_replies", qr));
    }

    private static Map<String, Object> socialEnvoltorio(String psid, Map<String, Object> message) {
        return Map.of("recipient", Map.of("id", psid), "messaging_type", "RESPONSE", "message", message);
    }

    // ---------- Respaldo en texto ----------

    static String respaldoProducto(TarjetaProducto t) {
        StringBuilder sb = new StringBuilder(textoProducto(t, Integer.MAX_VALUE));
        if (imagenValida(t.imagenUrl())) sb.append("\nFoto: ").append(t.imagenUrl());
        sb.append("\n\n").append(opcionesNumeradas(t.botonesEfectivos().stream().map(Boton::titulo).toList()));
        return sb.toString();
    }

    static String respaldoBotones(String texto, List<Boton> botones) {
        return texto + "\n\n" + opcionesNumeradas(
            botones.stream().filter(b -> b != null && b.titulo() != null).map(Boton::titulo).toList());
    }

    static String respaldoLista(String texto, List<FilaLista> filas) {
        List<String> ts = new ArrayList<>();
        for (FilaLista f : filas) {
            if (f == null || f.titulo() == null) continue;
            ts.add(f.descripcion() == null || f.descripcion().isBlank() ? f.titulo() : f.titulo() + " - " + f.descripcion());
        }
        return texto + "\n\n" + opcionesNumeradas(ts);
    }

    private static String opcionesNumeradas(List<String> titulos) {
        StringBuilder sb = new StringBuilder("Responde con el número:");
        for (int i = 0; i < titulos.size(); i++) sb.append('\n').append(i + 1).append(". ").append(titulos.get(i));
        return sb.toString();
    }

    private static String recortarId(String id, int max) {
        return id.length() <= max ? id : id.substring(0, max);
    }

    static boolean esWhatsapp(Canal c) { return c == Canal.WHATSAPP; }
}
