package com.hotclick.service.catalogo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

/**
 * P11-01: descarga de URLs externas sin SSRF. Solo https al puerto 443; el host se resuelve
 * por DNS y se rechaza si alguna IP es loopback, privada, link-local (incluye 169.254.169.254),
 * CGNAT, ULA, multicast o no especificada. Las redirecciones se siguen a mano (máx. 3) y
 * cada salto se revalida. Límite de tamaño y de tiempo.
 */
public final class UrlExternaSegura {

    public static final String MSG_NO_PERMITIDA = "URL no permitida.";
    private static final int MAX_REDIRECCIONES = 3;

    /** Resolución DNS reemplazable en tests. */
    public interface Resolver { InetAddress[] resolver(String host) throws UnknownHostException; }
    static volatile Resolver resolver = InetAddress::getAllByName;

    public record Respuesta(byte[] cuerpo, String contentType, String urlFinal) {}

    private UrlExternaSegura() {}

    /** Valida esquema, puerto y destino. Devuelve la URI normalizada o lanza IllegalArgumentException. */
    public static URI validar(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) throw new IllegalArgumentException("Ingresá una URL válida.");
        URI uri;
        try {
            uri = new URI(rawUrl.trim());
        } catch (Exception e) {
            throw new IllegalArgumentException("Ingresá una URL válida.");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("Solo se permiten URLs https.");
        }
        if (uri.getRawUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) {
            throw new IllegalArgumentException(MSG_NO_PERMITIDA);
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) throw new IllegalArgumentException("Ingresá una URL válida.");
        InetAddress[] ips;
        try {
            ips = resolver.resolver(host.toLowerCase(Locale.ROOT));
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("No se pudo encontrar ese sitio.");
        }
        if (ips == null || ips.length == 0) throw new IllegalArgumentException("No se pudo encontrar ese sitio.");
        for (InetAddress ip : ips) {
            if (esInterna(ip)) throw new IllegalArgumentException(MSG_NO_PERMITIDA);
        }
        return uri;
    }

    static boolean esInterna(InetAddress ip) {
        if (ip.isLoopbackAddress() || ip.isAnyLocalAddress() || ip.isLinkLocalAddress()
                || ip.isSiteLocalAddress() || ip.isMulticastAddress()) return true;
        byte[] b = ip.getAddress();
        if (ip instanceof Inet4Address) {
            int a0 = b[0] & 0xff, a1 = b[1] & 0xff;
            return a0 == 0 || a0 == 127 || a0 == 10
                || (a0 == 100 && a1 >= 64 && a1 <= 127)          // CGNAT
                || (a0 == 172 && a1 >= 16 && a1 <= 31)
                || (a0 == 192 && a1 == 168) || (a0 == 169 && a1 == 254)
                || (a0 == 192 && a1 == 0 && (b[2] & 0xff) == 0)
                || (a0 == 198 && (a1 == 18 || a1 == 19)) || a0 >= 224;
        }
        if (ip instanceof Inet6Address) {
            if ((b[0] & 0xfe) == 0xfc) return true;                // fc00::/7 ULA
            boolean mapeada = true;                                 // ::ffff:a.b.c.d
            for (int i = 0; i < 10; i++) if (b[i] != 0) { mapeada = false; break; }
            if (mapeada && (b[10] & 0xff) == 0xff && (b[11] & 0xff) == 0xff) {
                try {
                    return esInterna(InetAddress.getByAddress(new byte[]{b[12], b[13], b[14], b[15]}));
                } catch (UnknownHostException e) { return true; }
            }
            if ((b[0] & 0xff) == 0x20 && (b[1] & 0xff) == 0x02) return true; // 6to4
            if ((b[0] & 0xff) == 0x00 && (b[1] & 0xff) == 0x64 && (b[2] & 0xff) == 0xff && (b[3] & 0xff) == 0x9b) return true; // NAT64
        }
        return false;
    }

    /** GET con revalidación en cada redirección, tope de bytes y de tiempo. */
    public static Respuesta descargar(String rawUrl, int maxBytes, int timeoutMs, String userAgent) throws IOException {
        String actual = rawUrl;
        for (int salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
            URI uri = validar(actual);
            HttpURLConnection con = (HttpURLConnection) uri.toURL().openConnection();
            con.setInstanceFollowRedirects(false);
            con.setConnectTimeout(Math.min(timeoutMs, 10_000));
            con.setReadTimeout(timeoutMs);
            con.setRequestProperty("User-Agent", userAgent);
            try {
                int st = con.getResponseCode();
                if (st >= 300 && st < 400) {
                    String loc = con.getHeaderField("Location");
                    if (loc == null) throw new IOException("redirección sin destino");
                    actual = uri.resolve(loc.trim()).toString();
                    continue;
                }
                if (st < 200 || st >= 300) throw new IOException("HTTP " + st);
                long largo = con.getContentLengthLong();
                if (largo > maxBytes) throw new IOException("respuesta demasiado grande");
                long limite = System.currentTimeMillis() + timeoutMs;
                try (InputStream in = con.getInputStream()) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        if (out.size() + n > maxBytes) throw new IOException("respuesta demasiado grande");
                        if (System.currentTimeMillis() > limite) throw new IOException("descarga demasiado lenta");
                        out.write(buf, 0, n);
                    }
                    return new Respuesta(out.toByteArray(), con.getContentType(), uri.toString());
                }
            } finally {
                con.disconnect();
            }
        }
        throw new IOException("demasiadas redirecciones");
    }
}
