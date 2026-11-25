package com.hotclick.agente.voz;

import com.hotclick.service.catalogo.UrlExternaSegura;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.SystemDefaultDnsResolver;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Resolutor DNS para la descarga de audio (AG-13, contra DNS rebinding). El cliente HTTP se conecta exactamente a las
 * IPs que devuelve este resolutor, así que la IP que se valida es la misma con la que se abre el socket: no hay una
 * segunda consulta DNS que un atacante pueda cambiar entre la validación y la conexión. Si alguna IP es interna
 * (loopback, privada, link-local, metadatos de la nube, CGNAT, ULA...), se rechaza todo el host. TLS sigue validando
 * el certificado contra el nombre del host.
 */
final class ResolutorDnsSeguro implements DnsResolver {

    /** Resolución base reemplazable en tests. */
    interface Base {
        InetAddress[] resolver(String host) throws UnknownHostException;
    }

    private final Base base;

    ResolutorDnsSeguro() {
        this(SystemDefaultDnsResolver.INSTANCE::resolve);
    }

    ResolutorDnsSeguro(Base base) {
        this.base = base;
    }

    @Override
    public InetAddress[] resolve(String host) throws UnknownHostException {
        if (host == null || !DescargadorAudio.dominioPermitido(host.toLowerCase(java.util.Locale.ROOT))) {
            throw new UnknownHostException("host no permitido");
        }
        InetAddress[] ips = base.resolver(host);
        if (ips == null || ips.length == 0) throw new UnknownHostException("sin direcciones");
        for (InetAddress ip : ips) {
            // Sin el host ni la IP en el mensaje: no se registran datos del adjunto.
            if (UrlExternaSegura.esInterna(ip)) throw new UnknownHostException("IP interna no permitida");
        }
        return ips;
    }

    @Override
    public String resolveCanonicalHostname(String host) throws UnknownHostException {
        return host;
    }
}
