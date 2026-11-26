package com.hotclick.agente.voz;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** AG-13: la descarga de audio no se conecta a IPs internas aunque el DNS de un dominio permitido apunte a ellas. */
class ResolutorDnsSeguroTest {

    private static final String HOST = "lookaside.fbsbx.com";

    private static InetAddress ip(String literal) throws UnknownHostException {
        return InetAddress.getByName(literal); // literal: no consulta DNS
    }

    @Test
    void devuelveLasIpsPublicasTalCual() throws Exception {
        InetAddress publica = ip("157.240.1.1");
        ResolutorDnsSeguro r = new ResolutorDnsSeguro(h -> new InetAddress[]{publica});

        assertThat(r.resolve(HOST)).containsExactly(publica);
    }

    @ParameterizedTest
    @ValueSource(strings = {"127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"})
    void rechazaIpsInternas(String interna) throws Exception {
        InetAddress mala = ip(interna);
        ResolutorDnsSeguro r = new ResolutorDnsSeguro(h -> new InetAddress[]{mala});

        assertThatThrownBy(() -> r.resolve(HOST)).isInstanceOf(UnknownHostException.class);
    }

    @Test
    void unaSolaIpInternaEntreVariasRechazaElHost() throws Exception {
        InetAddress[] mezcla = {ip("157.240.1.1"), ip("10.1.2.3")};
        ResolutorDnsSeguro r = new ResolutorDnsSeguro(h -> mezcla);

        assertThatThrownBy(() -> r.resolve(HOST)).isInstanceOf(UnknownHostException.class);
    }

    @Test
    void hostFueraDeLaListaBlancaNiSiquieraSeResuelve() {
        AtomicInteger consultas = new AtomicInteger();
        ResolutorDnsSeguro r = new ResolutorDnsSeguro(h -> {
            consultas.incrementAndGet();
            return new InetAddress[]{ip("157.240.1.1")};
        });

        assertThatThrownBy(() -> r.resolve("evil.example.com")).isInstanceOf(UnknownHostException.class);
        assertThat(consultas).hasValue(0);
    }

    @Test
    void sinDireccionesSeRechaza() {
        ResolutorDnsSeguro r = new ResolutorDnsSeguro(h -> new InetAddress[0]);

        assertThatThrownBy(() -> r.resolve(HOST)).isInstanceOf(UnknownHostException.class);
    }

    /** Rebinding: el DNS del dominio permitido apunta a loopback; el cliente real de la descarga no abre la conexión. */
    @Test
    void elClienteDeLaDescargaNoSeConectaAUnaIpInterna() throws Exception {
        InetAddress loopback = ip("127.0.0.1");
        AtomicInteger consultas = new AtomicInteger();
        ResolutorDnsSeguro dns = new ResolutorDnsSeguro(h -> {
            consultas.incrementAndGet();
            return new InetAddress[]{loopback};
        });
        RestTemplate http = new RestTemplate(new HttpComponentsClientHttpRequestFactory(
            DescargadorAudio.clienteHttp(new VozConfig(1024, 120, 5, 0), dns)));

        assertThatThrownBy(() -> http.execute(URI.create("https://" + HOST + "/audio"), HttpMethod.GET, null, resp -> null))
            .isInstanceOf(ResourceAccessException.class);
        assertThat(consultas).hasValue(1);
    }
}
