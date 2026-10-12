package com.hotclick.service.catalogo;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("P11-01 | import por URL sin SSRF")
class UrlExternaSeguraTest {

    @AfterEach
    void restaurar() { UrlExternaSegura.resolver = InetAddress::getAllByName; }

    @ParameterizedTest
    @ValueSource(strings = {
        "https://127.0.0.1/", "https://2130706433/", "https://0x7f000001/", "https://172.30.0.2/",
        "https://10.1.2.3/", "https://192.168.1.1/", "https://169.254.169.254/latest/meta-data/",
        "https://[::1]/", "https://[::ffff:127.0.0.1]/", "https://[fd00::1]/", "https://100.64.0.1/",
        "https://0.0.0.0/", "https://localhost/", "http://example.com/", "file:///etc/passwd",
        "https://example.com:8080/", "https://user@example.com/"
    })
    void rechazaDestinosInternosYEsquemas(String url) {
        UrlExternaSegura.resolver = h -> h.matches("[a-z.]+") && !h.equals("localhost")
            ? new InetAddress[]{InetAddress.getByName("93.184.216.34")} : InetAddress.getAllByName(h);
        assertThatThrownBy(() -> UrlExternaSegura.validar(url)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("un nombre público que resuelve a IP interna (rebinding/DNS) se rechaza")
    void dnsAInterna() {
        UrlExternaSegura.resolver = h -> new InetAddress[]{
            InetAddress.getByName("93.184.216.34"), InetAddress.getByName("169.254.169.254")};
        assertThatThrownBy(() -> UrlExternaSegura.validar("https://tienda.example.com/"))
            .hasMessage(UrlExternaSegura.MSG_NO_PERMITIDA);
    }

    @Test
    void aceptaHttpsPublico() {
        UrlExternaSegura.resolver = h -> new InetAddress[]{InetAddress.getByName("93.184.216.34")};
        assertThat(UrlExternaSegura.validar("https://tienda.example.com/catalogo").getHost())
            .isEqualTo("tienda.example.com");
    }

    @Test
    @DisplayName("la descarga revalida antes de conectar: un salto interno nunca se abre")
    void descargaRevalida() {
        assertThatThrownBy(() -> UrlExternaSegura.descargar("https://127.0.0.1/", 1024, 1000, "t"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
