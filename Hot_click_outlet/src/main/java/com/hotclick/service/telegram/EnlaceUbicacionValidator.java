package com.hotclick.service.telegram;

import com.hotclick.model.PedidoEntrega;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Valida y normaliza enlaces de Google Maps / Waze que pega el comprador (lista blanca de hosts).
 * NO hace ninguna petición de red ni sigue redirecciones: un enlace corto (maps.app.goo.gl, goo.gl/maps,
 * waze.com/ul/h…) se guarda tal cual, sin coordenadas. Rechaza cualquier otro esquema, host o puerto.
 */
public final class EnlaceUbicacionValidator {

    /** Resultado de un enlace aceptado. {@code lat}/{@code lng} solo si venían en la URL. */
    public record Resultado(String fuente, String urlNormalizada, Double lat, Double lng, String consulta) {
        public boolean tieneCoordenadas() { return lat != null && lng != null; }
    }

    static final int MAX_URL = 500;
    static final int MAX_CONSULTA = 200;

    private static final Pattern URL_CON_ESQUEMA = Pattern.compile("(?i)https?://[^\\s<>\"']+");
    private static final Pattern ESQUEMA_ESTRANO = Pattern.compile("(?i)(^|\\s)(javascript|data|vbscript|file|ftp|intent|tel|sms|mailto):");
    private static final Pattern SIN_ESQUEMA = Pattern.compile(
        "(?i)(^|\\s)((?:maps\\.app\\.goo\\.gl|goo\\.gl|maps\\.google\\.com|(?:www\\.)?google\\.com|(?:www\\.)?google\\.co\\.cr|(?:www\\.)?waze\\.com)/[^\\s<>\"']*)");
    private static final Pattern PAR_COORD = Pattern.compile("(-?\\d{1,3}\\.\\d{1,12})\\s*,\\s*(-?\\d{1,3}\\.\\d{1,12})");
    private static final Pattern ARROBA_COORD = Pattern.compile("@(-?\\d{1,3}\\.\\d{1,12}),(-?\\d{1,3}\\.\\d{1,12})");
    private static final Pattern BANDERAS_COORD = Pattern.compile("!3d(-?\\d{1,3}\\.\\d{1,12})!4d(-?\\d{1,3}\\.\\d{1,12})");

    private EnlaceUbicacionValidator() {}

    /** @return el enlace normalizado, o vacío si el texto no trae un enlace permitido. */
    public static Optional<Resultado> analizar(String texto) {
        if (texto == null || texto.isBlank() || texto.length() > 2_000) return Optional.empty();
        String candidato = extraerCandidato(texto);
        if (candidato == null) return Optional.empty();
        URI uri;
        try {
            uri = new URI(candidato);
        } catch (Exception e) {
            return Optional.empty();
        }
        String esquema = uri.getScheme();
        if (esquema == null || !(esquema.equalsIgnoreCase("https") || esquema.equalsIgnoreCase("http"))) return Optional.empty();
        if (uri.getRawUserInfo() != null || uri.getPort() != -1) return Optional.empty();
        String host = uri.getHost() == null ? null : uri.getHost().toLowerCase(Locale.ROOT);
        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        if (host == null || path.contains("..") || path.contains("//")) return Optional.empty();
        String fuente = fuentePermitida(host, path);
        if (fuente == null) return Optional.empty();

        String query = uri.getRawQuery();
        String url = "https://" + host + path + (query != null && !query.isEmpty() ? "?" + query : "");
        if (url.length() > MAX_URL) return Optional.empty();

        double[] coord = coordenadas(path, query);
        String consulta = consultaTexto(query);
        if (PedidoEntrega.GOOGLE_MAPS.equals(fuente) && coord != null && "maps.google.com".equals(host)
                && (path.isEmpty() || "/".equals(path)) && tieneParametro(query, "ll")) {
            fuente = PedidoEntrega.WHATSAPP; // el pin de WhatsApp llega como https://maps.google.com/?q=lat,lng&ll=…
        }
        return Optional.of(new Resultado(fuente, url,
            coord != null ? coord[0] : null, coord != null ? coord[1] : null, consulta));
    }

    /** Lista blanca exacta de host + prefijo de ruta. */
    static String fuentePermitida(String host, String path) {
        return switch (host) {
            case "maps.app.goo.gl" -> path.length() > 1 ? PedidoEntrega.GOOGLE_MAPS : null;
            case "maps.google.com" -> PedidoEntrega.GOOGLE_MAPS;
            case "goo.gl" -> path.startsWith("/maps") ? PedidoEntrega.GOOGLE_MAPS : null;
            case "www.google.com", "google.com", "google.co.cr", "www.google.co.cr" ->
                (path.equals("/maps") || path.startsWith("/maps/")) ? PedidoEntrega.GOOGLE_MAPS : null;
            case "waze.com", "www.waze.com" ->
                (path.equals("/ul") || path.startsWith("/ul/") || path.equals("/live-map") || path.startsWith("/live-map/"))
                    ? PedidoEntrega.WAZE : null;
            default -> null;
        };
    }

    private static String extraerCandidato(String texto) {
        if (ESQUEMA_ESTRANO.matcher(texto).find()) return null;
        Matcher m = URL_CON_ESQUEMA.matcher(texto);
        if (m.find()) return limpiarCola(m.group());
        Matcher s = SIN_ESQUEMA.matcher(texto);
        if (s.find()) return "https://" + limpiarCola(s.group(2));
        return null;
    }

    private static String limpiarCola(String url) {
        return url.replaceAll("[.,;:!?)\\]]+$", "");
    }

    private static boolean tieneParametro(String query, String nombre) {
        return valorParametro(query, nombre) != null;
    }

    private static String valorParametro(String query, String nombre) {
        if (query == null) return null;
        for (String par : query.split("&")) {
            int i = par.indexOf('=');
            String k = i < 0 ? par : par.substring(0, i);
            if (k.equalsIgnoreCase(nombre)) {
                String v = i < 0 ? "" : par.substring(i + 1);
                try {
                    return URLDecoder.decode(v, StandardCharsets.UTF_8);
                } catch (IllegalArgumentException e) {
                    return null;
                }
            }
        }
        return null;
    }

    private static double[] coordenadas(String path, String query) {
        for (String clave : new String[] {"ll", "q", "query", "destination", "daddr", "center", "to"}) {
            String v = valorParametro(query, clave);
            double[] c = v == null ? null : primerPar(PAR_COORD, v);
            if (c != null) return c;
        }
        String ruta;
        try {
            ruta = URLDecoder.decode(path, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null;
        }
        double[] c = primerPar(ARROBA_COORD, ruta);
        if (c == null) c = primerPar(BANDERAS_COORD, ruta);
        if (c == null && ruta.startsWith("/maps/search/")) c = primerPar(PAR_COORD, ruta);
        return c;
    }

    private static double[] primerPar(Pattern p, String s) {
        Matcher m = p.matcher(s);
        while (m.find()) {
            double lat = Double.parseDouble(m.group(1));
            double lng = Double.parseDouble(m.group(2));
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return new double[] {lat, lng};
        }
        return null;
    }

    /** Texto del lugar si {@code q} no son coordenadas (p. ej. «Supermercado X, Belén»). */
    private static String consultaTexto(String query) {
        String q = valorParametro(query, "q");
        if (q == null) q = valorParametro(query, "query");
        if (q == null || q.isBlank() || PAR_COORD.matcher(q).find()) return null;
        String limpio = q.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
        if (limpio.isEmpty()) return null;
        return limpio.length() <= MAX_CONSULTA ? limpio : limpio.substring(0, MAX_CONSULTA);
    }

    /** ¿Pasa la validación de rango un par de coordenadas de la ubicación nativa de Telegram? */
    public static boolean coordenadaValida(double lat, double lng) {
        return !Double.isNaN(lat) && !Double.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
            && !(lat == 0 && lng == 0);
    }

    /** Enlace de Google Maps (solo coordenadas, de nuestra autoría) para que el negocio abra el pin. */
    public static String urlDeCoordenadas(double lat, double lng) {
        return String.format(Locale.ROOT, "https://www.google.com/maps?q=%.6f,%.6f", lat, lng);
    }
}
