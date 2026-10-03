package com.hotclick.service.contacto;

import java.util.Locale;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Oculta canales de contacto directo en texto libre del vendedor que se publica al visitante
 * (descripciones, variantes, tagline, pie, reseñas, mensajes de encargo o cotización).
 * Se aplica solo en la salida pública y solo si el plan no tiene contacto directo
 * ({@link ContactoPublicoPolicy}); lo guardado y los paneles no cambian.
 *
 * <p>Qué oculta: teléfonos (CR 8888-8888, +506, dígitos separados, 7 o más dígitos seguidos), correos,
 * @usuarios, enlaces a WhatsApp/Instagram/TikTok/Facebook/Telegram y cualquier enlace externo.
 * Qué respeta: montos (₡17.500, ₡1.250.000, 4000-5000 colones), medidas (200x90 cm), años y rangos
 * de años (modelo 2026, 2025-2026), tallas (40 41 42 43) y enlaces a hotclick.lat.
 *
 * <p>El reemplazo es {@link #OCULTO}. Es texto de backend en español; el frontend lo puede
 * reconocer por ese valor exacto si algún día se traduce.
 */
public final class ContactoTextoFiltro {

    public static final String OCULTO = "[contacto oculto]";

    private static final int I = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;

    /**
     * Tope de caracteres que se revisan (el campo más largo admite 10 000). Lo que pasa del tope no se
     * publica: se cambia por {@link #OCULTO}.
     */
    static final int MAX_TEXTO = 20_000;
    /** Para cortar en un espacio y no partir un teléfono o un correo. */
    private static final int MARGEN_CORTE = 200;

    /**
     * Etiqueta HTML: "<" seguido de letra, "/" o "!" (así "< 5 cm" no cuenta como etiqueta). Sin "<" adentro:
     * con muchos "<a" sin cerrar cada intento termina en el "<" siguiente y no al final del texto.
     */
    private static final Pattern TAG = Pattern.compile("<[a-zA-Z/!][^<>]*>");
    private static final Pattern A_CON_HREF = Pattern.compile("(?is)^<a\\b[^>]*\\bhref\\s*=\\s*[\"']?([^\"'\\s>]*)");

    // Sin repeticiones de grupos (`(?:...)*`): en Java recursan y pueden desbordar la pila con textos largos
    // (Sonar java:S5998). Los subdominios van con clases de caracteres.
    // Tiempo lineal (Sonar java:S5852): los correos empiezan solo al inicio de una palabra (lookbehind) o
    // justo donde terminó el anterior (\G); sin eso "aaaa…" sin espacios se reintenta desde cada letra
    // (cuadrático). Los cuantificadores posesivos (`++`, `*+`) no devuelven lo que tomaron cuando lo que
    // sigue no puede ser de su clase, y "\s*" ya no compite con "\s+arroba".
    private static final Pattern ESQUEMA_CONTACTO = Pattern.compile("\\b(?:mailto|tel|sms|whatsapp|tg):[^\\s<>\"']+", I);
    private static final Pattern URL = Pattern.compile("(?:\\bhttps?://|\\bwww\\.)[^\\s<>\"']+", I);
    private static final String INICIO_CORREO = "(?:\\G|(?<![A-Za-z0-9._%+-]))";
    private static final Pattern EMAIL = Pattern.compile(
        INICIO_CORREO + "[A-Za-z0-9._%+-]++@[A-Za-z0-9-][A-Za-z0-9.-]*\\.[A-Za-z]{2,}");
    private static final Pattern EMAIL_ESCRITO = Pattern.compile(
        INICIO_CORREO + "[A-Za-z0-9._%+-]++(?:\\s*+(?:\\(at\\)|\\[at\\])|\\s++arroba\\s)\\s*+"
            + "[A-Za-z0-9-]++(?:\\s*+(?:\\.|\\(dot\\))|\\s++punto\\s)\\s*+[A-Za-z]{2,}", I);
    private static final Pattern DOMINIO_CONTACTO = Pattern.compile(
        "(?<![\\w.@-])(?:[a-z0-9-][a-z0-9.-]*\\.)?(?:wa\\.me|wa\\.link|whatsapp\\.com|instagram\\.com|instagr\\.am|tiktok\\.com"
            + "|facebook\\.com|fb\\.com|fb\\.me|fb\\.watch|m\\.me|t\\.me|telegram\\.me|linktr\\.ee|bit\\.ly"
            + "|twitter\\.com|x\\.com|threads\\.net|youtube\\.com|youtu\\.be)(?![\\w-])(?:/[^\\s<>\"']*)?", I);
    private static final Pattern DOMINIO = Pattern.compile(
        "(?<![\\w.@-])[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\\."
            + "(?:com|net|org|cr|lat|co|io|store|shop|site|online|info|biz|app|page|xyz)(?![\\w-])(?:/[^\\s<>\"']*)?", I);
    private static final Pattern HANDLE = Pattern.compile("(?<![\\w.@])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?");

    private static final Pattern TEL_INTERNACIONAL = Pattern.compile("(?<![\\w+])\\+\\s?\\d{1,3}(?:[\\s.\\-()]*\\d){7,12}(?!\\d)");
    private static final Pattern TEL_506 = Pattern.compile("(?<!\\d)\\(?506\\)?[\\s.\\-]?[245678]\\d{3}[\\s.\\-]?\\d{4}(?!\\d)");
    /** 8 dígitos de CR (2xxx fijo, 4/5/6/7/8 celular o VoIP): 8888-8888, 8888 8888, 8888.8888, 88888888. */
    private static final Pattern TEL_CR = Pattern.compile("(?<![\\d.,])([245678]\\d{3})[\\s.\\-]?(\\d{4})(?![\\d])");
    /** Dígitos sueltos separados: "8 8 8 8 8 8 8 8", "8.8.8.8.8.8.8". */
    private static final Pattern DIGITOS_SEPARADOS = Pattern.compile("(?<![\\d.,])\\d(?:[\\s.\\-]\\d){6,}(?![\\d])");
    /** 7 o más dígitos seguidos. */
    private static final Pattern DIGITOS_LARGOS = Pattern.compile("(?<![\\d.,])\\d{7,}(?![\\d])");

    private static final Pattern ANIO = Pattern.compile("(?:19|20)\\d{2}");
    private static final Pattern MONEDA_DESPUES = Pattern.compile("^\\s?(?:colones|crc|mil|₡|usd|dólares|dolares)\\b", I);

    private ContactoTextoFiltro() {}

    /**
     * Texto plano o HTML del editor. Null y vacío se devuelven igual. Más de {@link #MAX_TEXTO} caracteres:
     * se revisa hasta el tope y el resto queda como {@link #OCULTO}.
     */
    public static String ocultar(String texto) {
        if (texto == null || texto.isEmpty()) return texto;
        if (texto.length() > MAX_TEXTO) return ocultarHtml(cortar(texto)) + " " + OCULTO;
        return ocultarHtml(texto);
    }

    /** Corta en el último espacio antes del tope (si hay uno cerca); nunca parte un par sustituto. */
    private static String cortar(String texto) {
        int corte = MAX_TEXTO;
        for (int i = MAX_TEXTO; i > MAX_TEXTO - MARGEN_CORTE; i--) {
            if (Character.isWhitespace(texto.charAt(i))) {
                corte = i;
                break;
            }
        }
        if (Character.isLowSurrogate(texto.charAt(corte))) corte--;
        return texto.substring(0, corte);
    }

    private static String ocultarHtml(String texto) {
        if (!TAG.matcher(texto).find()) return ocultarTexto(texto);
        Matcher m = TAG.matcher(texto);
        StringBuilder out = new StringBuilder(texto.length());
        int ultimo = 0;
        while (m.find()) {
            out.append(ocultarTexto(texto.substring(ultimo, m.start())));
            out.append(filtrarEtiqueta(m.group()));
            ultimo = m.end();
        }
        out.append(ocultarTexto(texto.substring(ultimo)));
        return out.toString();
    }

    /** {@code <a href="externo">} pierde el href (queda {@code <a>}); el resto de las etiquetas no cambia. */
    private static String filtrarEtiqueta(String tag) {
        Matcher a = A_CON_HREF.matcher(tag);
        if (!a.find()) return tag;
        String href = a.group(1);
        boolean interno = href.isEmpty() || href.startsWith("/") && !href.startsWith("//")
            || href.startsWith("#") || esHotclick(href);
        return interno ? tag : "<a>";
    }

    private static String ocultarTexto(String t) {
        if (t.isBlank()) return t;
        String s = t.replace("&nbsp;", " ").replace("&#64;", "@");
        s = ESQUEMA_CONTACTO.matcher(s).replaceAll(OCULTO);
        s = reemplazar(URL, s, ContactoTextoFiltro::enlace);
        s = EMAIL.matcher(s).replaceAll(OCULTO);
        s = EMAIL_ESCRITO.matcher(s).replaceAll(OCULTO);
        s = reemplazar(DOMINIO_CONTACTO, s, ContactoTextoFiltro::enlace);
        s = reemplazar(DOMINIO, s, ContactoTextoFiltro::enlace);
        s = HANDLE.matcher(s).replaceAll(Matcher.quoteReplacement(OCULTO));
        s = TEL_INTERNACIONAL.matcher(s).replaceAll(OCULTO);
        s = TEL_506.matcher(s).replaceAll(OCULTO);
        s = reemplazarTelCr(s);
        s = reemplazarSiNoEsMonto(DIGITOS_SEPARADOS, s);
        s = reemplazarSiNoEsMonto(DIGITOS_LARGOS, s);
        return s;
    }

    /** Enlaces: hotclick.lat se respeta; la puntuación final (". , ) ;") no es parte del enlace. */
    private static String enlace(String url) {
        String cola = "";
        String u = url;
        while (!u.isEmpty() && ".,;:!?)]".indexOf(u.charAt(u.length() - 1)) >= 0) {
            cola = u.charAt(u.length() - 1) + cola;
            u = u.substring(0, u.length() - 1);
        }
        return (esHotclick(u) ? u : OCULTO) + cola;
    }

    private static boolean esHotclick(String url) {
        String u = url.toLowerCase(Locale.ROOT).replaceFirst("^(?:https?:)?//", "").replaceFirst("^www\\.", "");
        int fin = u.length();
        for (char c : new char[]{'/', '?', '#', ':'}) {
            int i = u.indexOf(c);
            if (i >= 0 && i < fin) fin = i;
        }
        String host = u.substring(0, fin);
        return host.equals("hotclick.lat") || host.endsWith(".hotclick.lat");
    }

    private static String reemplazarTelCr(String s) {
        Matcher m = TEL_CR.matcher(s);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            boolean anios = ANIO.matcher(m.group(1)).matches() && ANIO.matcher(m.group(2)).matches();
            boolean montosRedondos = m.group(1).endsWith("00") && m.group(2).endsWith("00");
            boolean monto = montoAlrededor(s, m.start(), m.end());
            m.appendReplacement(out, Matcher.quoteReplacement(anios || montosRedondos || monto ? m.group() : OCULTO));
        }
        m.appendTail(out);
        return out.toString();
    }

    private static String reemplazarSiNoEsMonto(Pattern p, String s) {
        Matcher m = p.matcher(s);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(out, Matcher.quoteReplacement(montoAlrededor(s, m.start(), m.end()) ? m.group() : OCULTO));
        }
        m.appendTail(out);
        return out.toString();
    }

    /** "₡12345678", "$ 1500000", "4000-5000 colones": es un monto, no un teléfono. */
    private static boolean montoAlrededor(String s, int inicio, int fin) {
        int i = inicio - 1;
        if (i >= 0 && s.charAt(i) == ' ') i--;
        if (i >= 0 && (s.charAt(i) == '₡' || s.charAt(i) == '$')) return true;
        return MONEDA_DESPUES.matcher(s).region(fin, s.length()).lookingAt();
    }

    private static String reemplazar(Pattern p, String s, Function<String, String> f) {
        Matcher m = p.matcher(s);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(out, Matcher.quoteReplacement(f.apply(m.group())));
        }
        m.appendTail(out);
        return out.toString();
    }

    // ── Video del producto ────────────────────────────────────────────────────────────────

    private static final Pattern[] VIDEO_PERMITIDO = {
        Pattern.compile("^https?://(?:www\\.|m\\.)?youtube\\.com/watch\\?(?:\\S*&)?v=[\\w-]{11}(?:[&#]\\S*)?$", I),
        Pattern.compile("^https?://(?:www\\.|m\\.)?youtube\\.com/(?:shorts|embed|live)/[\\w-]{11}/?(?:[?#]\\S*)?$", I),
        Pattern.compile("^https?://(?:www\\.)?youtube-nocookie\\.com/embed/[\\w-]{11}/?(?:[?#]\\S*)?$", I),
        Pattern.compile("^https?://youtu\\.be/[\\w-]{11}/?(?:[?#]\\S*)?$", I),
        Pattern.compile("^https?://(?:www\\.)?instagram\\.com/(?:reel|reels|p|tv)/[\\w-]+/?(?:[?#]\\S*)?$", I),
        Pattern.compile("^https?://(?:www\\.|m\\.)?tiktok\\.com/@[\\w.-]+/video/\\d+/?(?:[?#]\\S*)?$", I),
        Pattern.compile("^https?://(?:www\\.)?vimeo\\.com/(?:video/)?\\d+/?(?:[?#]\\S*)?$", I),
        Pattern.compile("^https?://player\\.vimeo\\.com/video/\\d+/?(?:[?#]\\S*)?$", I),
    };
    /** instagram.com/usuario/reel/ID: se normaliza a /reel/ID/ para no publicar el usuario. */
    private static final Pattern IG_CON_USUARIO = Pattern.compile(
        "^https?://(?:www\\.)?instagram\\.com/[\\w.]+/(reel|reels|p|tv)/([\\w-]+)/?(?:[?#]\\S*)?$", I);

    /**
     * Solo enlaces a un video concreto (YouTube watch/shorts/youtu.be, Instagram /reel/ o /p/,
     * TikTok /video/, Vimeo con id). Perfiles, canales, inicios y "otra red" devuelven null.
     */
    public static String videoPermitido(String url) {
        if (url == null) return null;
        String u = url.trim();
        if (u.isEmpty()) return null;
        for (Pattern p : VIDEO_PERMITIDO) {
            if (p.matcher(u).matches()) return u;
        }
        Matcher ig = IG_CON_USUARIO.matcher(u);
        if (ig.matches()) {
            String tipo = ig.group(1).equalsIgnoreCase("reels") ? "reel" : ig.group(1).toLowerCase(Locale.ROOT);
            return "https://www.instagram.com/" + tipo + "/" + ig.group(2) + "/";
        }
        return null;
    }
}
