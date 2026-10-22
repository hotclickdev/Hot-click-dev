package com.hotclick.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Fuente única de los orígenes permitidos (cors.allowed.origins). La usan SecurityConfig (CORS) y
 * AuthController (/refresh). Fail-closed: sin la propiedad la lista queda vacía y no se permite ningún
 * origen. dev/test definen el valor en application-dev/test.properties, nunca como default en código.
 */
@Component
public class AllowedOrigins {

    private final List<String> origenes;

    public AllowedOrigins(@Value("${cors.allowed.origins:}") String raw) {
        this.origenes = parsear(raw);
    }

    static List<String> parsear(String raw) {
        if (raw == null) return List.of();
        return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public List<String> lista() {
        return origenes;
    }

    /** Coincidencia exacta (sin mayúsculas); nunca acepta null, vacío ni '*'. */
    public boolean permite(String origin) {
        if (origin == null || origin.isBlank()) return false;
        String o = origin.trim();
        for (String p : origenes) {
            if (!"*".equals(p) && p.equalsIgnoreCase(o)) return true;
        }
        return false;
    }

    /** Problema que impide arrancar en prod, o null si la lista es aceptable. */
    public static String problemaEnProduccion(String raw) {
        List<String> l = parsear(raw);
        if (l.isEmpty()) return "CORS_ALLOWED_ORIGINS vacío o ausente";
        for (String p : l) {
            if (p.contains("*")) return "CORS_ALLOWED_ORIGINS contiene '*'";
            String problema = problemaOrigen(p);
            if (problema != null) return "CORS_ALLOWED_ORIGINS: " + problema + " (" + p + ")";
        }
        return null;
    }

    /**
     * En prod solo {@code https://host[:puerto]} con host DNS público. Rechaza: userinfo, path, query, fragment;
     * localhost (también con punto final); cualquier host IPv4 en forma numérica (decimal, octal, hex o con
     * menos de 4 partes, p.ej. 2130706433, 0177.0.0.1, 0x7f.1, 127.1), y en IPv6 loopback, any, privadas,
     * link-local, ULA y CGNAT 100.64/10 (vía IPv4 mapeada). Fail-closed: también rechaza IPv4 públicas.
     */
    static String problemaOrigen(String origen) {
        java.net.URI uri;
        try {
            uri = new java.net.URI(origen);
        } catch (java.net.URISyntaxException e) {
            return "origen mal formado";
        }
        if (!"https".equalsIgnoreCase(uri.getScheme())) return "origen sin https";
        if (uri.getRawUserInfo() != null) return "origen con userinfo";
        if (uri.getRawPath() != null && !uri.getRawPath().isEmpty()) return "origen con path";
        if (uri.getRawQuery() != null) return "origen con query";
        if (uri.getRawFragment() != null) return "origen con fragment";
        String host = uri.getHost();
        if (host == null || host.isBlank()) return "origen sin host";
        host = host.toLowerCase(java.util.Locale.ROOT);
        if (host.startsWith("[") && host.endsWith("]")) host = host.substring(1, host.length() - 1);
        while (host.endsWith(".")) host = host.substring(0, host.length() - 1);
        if (host.isEmpty()) return "origen sin host";
        if (host.equals("localhost") || host.endsWith(".localhost")) return "origen localhost";
        if (host.contains(":")) {
            java.net.InetAddress ip;
            try {
                ip = java.net.InetAddress.getByName(host); // literal IPv6: no hace DNS
            } catch (java.net.UnknownHostException e) {
                return "IP mal formada";
            }
            return ipNoPublica(ip) ? "IP local o privada" : null;
        }
        if (esIpv4Numerica(host)) return "host IPv4 numérico";
        return null;
    }

    private static boolean ipNoPublica(java.net.InetAddress ip) {
        byte[] b = ip.getAddress();
        boolean ula = b.length == 16 && (b[0] & 0xfe) == 0xfc; // fc00::/7
        boolean cgnat = b.length == 4 && (b[0] & 0xff) == 100 && (b[1] & 0xc0) == 64; // 100.64/10
        return ip.isLoopbackAddress() || ip.isAnyLocalAddress() || ip.isSiteLocalAddress()
            || ip.isLinkLocalAddress() || ula || cgnat;
    }

    /** Como WHATWG: si la última etiqueta es numérica (decimal o 0x hex) el host se interpreta como IPv4. */
    private static boolean esIpv4Numerica(String host) {
        String[] et = host.split("\\.");
        String ultima = et[et.length - 1];
        return ultima.matches("\\d+") || ultima.matches("0x[0-9a-f]*");
    }
}
