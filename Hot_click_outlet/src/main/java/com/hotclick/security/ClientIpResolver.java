package com.hotclick.security;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Única fuente de verdad para "¿desde qué IP llega esta request?".
 *
 * X-Forwarded-For y X-Real-IP los puede escribir cualquiera que abra una conexión TCP
 * contra la app; solo son creíbles si esa conexión la abrió un proxy nuestro. Si el
 * contenedor queda alcanzable directo (puerto de la app abierto en el security group,
 * o un despliegue sin el Nginx delante), creerles permite rotar la identidad en cada
 * request y evadir a la vez RateLimitingFilter y BlockedIpFilter.
 *
 * Algoritmo:
 *   1. Peer TCP real. Si no está en {@code security.trusted-proxies} esa es la IP del
 *      cliente y los headers se descartan enteros.
 *   2. Peer de confianza → X-Forwarded-For recorrido de derecha a izquierda, salteando
 *      proxies de confianza. La primera entrada no confiable es el cliente: la agregó el
 *      último proxy honesto de la cadena y el cliente no la pudo falsificar.
 *   3. Sin X-Forwarded-For usable → X-Real-IP (Nginx lo setea desde $remote_addr).
 *   4. Fallback al peer.
 */
@Component
public class ClientIpResolver {

    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);

    static final String HEADER_FORWARDED_FOR = "X-Forwarded-For";
    static final String HEADER_REAL_IP       = "X-Real-IP";

    /**
     * Alias aceptado en {@code security.trusted-proxies}: loopback + rangos privados.
     * Cubre las dos topologías de producción sin configurar nada — en EC2 el peer es el
     * gateway de Docker (172.17.0.1) y en Render es la red interna (10.x). Un atacante que
     * llegue directo desde Internet tiene IP pública, queda fuera y sus headers se ignoran.
     */
    static final String PRIVATE_RANGES_ALIAS = "private";

    private static final List<String> PRIVATE_RANGES = List.of(
        "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16",
        "::1/128", "fc00::/7", "fe80::/10"
    );

    /** Tope de saltos inspeccionados en X-Forwarded-For: un header largo no debe costar CPU. */
    private static final int MAX_FORWARDED_HOPS = 16;

    /** IPv6 completo con IPv4 embebido y zona: 45 caracteres. */
    private static final int MAX_IP_LENGTH = 45;

    private static final Pattern IPV4 = Pattern.compile(
        "^(?:(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)$");

    /** Descarta hostnames antes de parsear: ningún nombre DNS contiene ':'. */
    private static final Pattern IPV6_CHARS = Pattern.compile("^[0-9A-Fa-f:.]{2,45}$");

    private final List<IpAddressMatcher> trustedProxies;

    public ClientIpResolver(
            @Value("${security.trusted-proxies:" + PRIVATE_RANGES_ALIAS + "}") String trustedProxies) {
        this.trustedProxies = parseRanges(trustedProxies);
        log.info("[CLIENT-IP] Rangos de proxy de confianza activos: {}", this.trustedProxies.size());
    }

    /** IP del cliente para rate limiting, bloqueo de IPs y auditoría de seguridad. */
    public String resolve(HttpServletRequest request) {
        if (request == null) return null;
        HttpServletRequest source = containerRequest(request);
        String peer = normalizeIp(source.getRemoteAddr());
        // Peer desconocido o no confiable: los headers los controla quien conecta.
        if (!isTrustedProxy(peer)) return peer;

        String forwarded = clientFromForwardedFor(source.getHeader(HEADER_FORWARDED_FOR));
        if (forwarded != null) return forwarded;
        String realIp = normalizeIp(source.getHeader(HEADER_REAL_IP));
        return realIp != null ? realIp : peer;
    }

    /** True si {@code ip} cae en alguno de los rangos de {@code security.trusted-proxies}. */
    public boolean isTrustedProxy(String ip) {
        if (!isIpLiteral(ip)) return false;
        for (IpAddressMatcher range : trustedProxies) {
            if (range.matches(ip)) return true;
        }
        return false;
    }

    /**
     * Primer salto de X-Forwarded-For, leído de derecha a izquierda, que no sea un proxy
     * de confianza. Los proxies agregan su peer al final, así que esa entrada la escribió
     * un proxy nuestro; todo lo que quede a su izquierda lo pudo inventar el cliente.
     * Si todos los saltos son de confianza devuelve el más a la izquierda inspeccionado.
     */
    String clientFromForwardedFor(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) return null;
        String[] hops = headerValue.split(",");
        int oldest = Math.max(0, hops.length - MAX_FORWARDED_HOPS);
        String leftmostTrusted = null;
        for (int i = hops.length - 1; i >= oldest; i--) {
            String hop = normalizeIp(hops[i]);
            if (hop == null) continue;
            if (!isTrustedProxy(hop)) return hop;
            leftmostTrusted = hop;
        }
        return leftmostTrusted;
    }

    /**
     * Request tal cual la entregó el contenedor. ForwardedHeaderFilter
     * ({@code server.forward-headers-strategy=FRAMEWORK}) corre antes que la cadena de
     * Spring Security: pisa getRemoteAddr() con el contenido de X-Forwarded-For sin
     * validar quién lo mandó, y de paso borra ese header. Desenvolver los wrappers
     * recupera el peer TCP verdadero y el header original.
     */
    private static HttpServletRequest containerRequest(HttpServletRequest request) {
        ServletRequest current = request;
        while (current instanceof ServletRequestWrapper wrapper) {
            current = wrapper.getRequest();
        }
        return current instanceof HttpServletRequest http ? http : request;
    }

    /** Recorta espacios, puerto, brackets y zona; null si no queda una IP literal. */
    static String normalizeIp(String raw) {
        if (raw == null) return null;
        String value = stripPort(raw.trim());
        int zone = value.indexOf('%');
        if (zone > 0) value = value.substring(0, zone);
        return isIpLiteral(value) ? value : null;
    }

    private static String stripPort(String value) {
        if (value.startsWith("[")) {
            int close = value.indexOf(']');
            return close > 1 ? value.substring(1, close) : value;
        }
        int colon = value.indexOf(':');
        // Un solo ':' con algo a la izquierda es "ipv4:puerto"; IPv6 sin brackets trae varios.
        boolean ipv4WithPort = colon > 0 && value.indexOf(':', colon + 1) < 0;
        return ipv4WithPort ? value.substring(0, colon) : value;
    }

    static boolean isIpLiteral(String value) {
        if (value == null || value.isEmpty() || value.length() > MAX_IP_LENGTH) return false;
        if (value.indexOf(':') < 0) return IPV4.matcher(value).matches();
        return IPV6_CHARS.matcher(value).matches() && parsesAsIpv6Literal(value);
    }

    /** Los brackets obligan a InetAddress a parsear como literal IPv6: nunca consulta DNS. */
    private static boolean parsesAsIpv6Literal(String value) {
        try {
            InetAddress.getByName("[" + value + "]");
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }

    private static List<IpAddressMatcher> parseRanges(String config) {
        List<IpAddressMatcher> ranges = new ArrayList<>();
        for (String cidr : expandAliases(config)) {
            addRange(ranges, cidr);
        }
        return List.copyOf(ranges);
    }

    /** Separa por comas, descarta vacíos y reemplaza el alias {@code private} por sus rangos. */
    private static List<String> expandAliases(String config) {
        List<String> cidrs = new ArrayList<>();
        for (String entry : config.split(",")) {
            String value = entry.trim();
            if (value.isEmpty()) continue;
            if (PRIVATE_RANGES_ALIAS.equalsIgnoreCase(value)) {
                cidrs.addAll(PRIVATE_RANGES);
            } else {
                cidrs.add(value);
            }
        }
        return cidrs;
    }

    private static void addRange(List<IpAddressMatcher> ranges, String cidr) {
        try {
            ranges.add(new IpAddressMatcher(cidr));
        } catch (IllegalArgumentException e) {
            log.warn("[CLIENT-IP] Rango inválido en security.trusted-proxies, ignorado: {}", cidr);
        }
    }
}
