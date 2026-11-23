package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IpEnmascarada: la IP completa no sale en logs, correos ni avisos")
class IpEnmascaradaTest {

    @Test
    void enmascaraIpv4ConservandoLaRed() {
        assertThat(IpEnmascarada.enmascarar("190.10.20.30")).isEqualTo("190.10.20.xxx");
        assertThat(IpEnmascarada.enmascarar(null)).isEmpty();
        assertThat(IpEnmascarada.enmascarar("no-es-ip")).isEqualTo("***");
    }

    @Test
    void enmascaraIpv6ConservandoSoloDosGrupos() {
        assertThat(IpEnmascarada.enmascarar("2001:db8:85a3:0:0:8a2e:370:7334")).isEqualTo("2001:db8:…");
    }

    @Test
    void enTextoLibreEnmascaraCadaIp() {
        String r = IpEnmascarada.enmascararEnTexto("5 intentos desde 190.10.20.30 y 10.0.0.7; viene de 190.10.20.30.");
        assertThat(r).doesNotContain("190.10.20.30", "10.0.0.7").contains("190.10.20.xxx", "10.0.0.xxx");
        assertThat(IpEnmascarada.enmascararEnTexto("sin ip, versión 1.2.3")).isEqualTo("sin ip, versión 1.2.3");
        assertThat(IpEnmascarada.enmascararEnTexto(null)).isNull();
    }

    @Test
    void redactarEnTextoLaQuitaPorCompleto() {
        assertThat(IpEnmascarada.redactarEnTexto("fallo desde 190.10.20.30 y 2001:db8:85a3:0:0:8a2e:370:7334"))
            .isEqualTo("fallo desde [ip] y [ip]");
    }
}
