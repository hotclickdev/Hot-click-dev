package com.hotclick.service.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[Auth] llave de fallos por IP: IPv6 → /64, IPv4 intacta")
class AuthSupportPrefijoIpTest {

    @Test
    @DisplayName("Dos direcciones del mismo /64 dan la misma llave; otro /64 da otra")
    void ipv6Prefijo64() {
        assertThat(AuthSupport.prefijoIp("2001:db8:1:2::1")).isEqualTo("2001:0db8:0001:0002::/64");
        assertThat(AuthSupport.prefijoIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).isEqualTo(AuthSupport.prefijoIp("2001:db8:1:2::1"));
        assertThat(AuthSupport.prefijoIp("2001:db8:1:3::1")).isNotEqualTo(AuthSupport.prefijoIp("2001:db8:1:2::1"));
    }

    @Test
    @DisplayName("IPv4, IPv4-mapeada, nula y 'desconocida' no se rompen")
    void otrasFormas() {
        assertThat(AuthSupport.prefijoIp("203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(AuthSupport.prefijoIp("::ffff:203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(AuthSupport.prefijoIp("desconocida")).isEqualTo("desconocida");
        assertThat(AuthSupport.prefijoIp(null)).isNull();
    }

    @Test
    @DisplayName("NAT64 (64:ff9b::/96): la llave es la IPv4 embebida, no un /64 compartido por todos los clientes del NAT")
    void nat64UsaLaIpv4Embebida() {
        // 203.0.113.5 = cb00:7105 ; 198.51.100.7 = c633:6407
        assertThat(AuthSupport.prefijoIp("64:ff9b::cb00:7105")).isEqualTo("203.0.113.5");
        assertThat(AuthSupport.prefijoIp("64:ff9b::203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(AuthSupport.prefijoIp("64:ff9b::c633:6407")).isEqualTo("198.51.100.7");
        assertThat(AuthSupport.prefijoIp("64:ff9b::c633:6407")).isNotEqualTo(AuthSupport.prefijoIp("64:ff9b::cb00:7105"));
        // coincide con la misma IPv4 vista de forma nativa (mismo cliente = mismos contadores)
        assertThat(AuthSupport.prefijoIp("64:ff9b::cb00:7105")).isEqualTo(AuthSupport.prefijoIp("203.0.113.5"));
    }

    @Test
    @DisplayName("Un IPv6 cercano a NAT64 pero fuera de /96 sigue siendo /64 (64:ff9b:1::/48 no se toca)")
    void fueraDeNat64SigueSiendo64() {
        assertThat(AuthSupport.prefijoIp("64:ff9b:1::cb00:7105")).isEqualTo("0064:ff9b:0001:0000::/64");
        assertThat(AuthSupport.prefijoIp("64:ff9b::1:cb00:7105")).isEqualTo("0064:ff9b:0000:0000::/64");
    }

    @Test
    @DisplayName("Misma reducción que las llaves del limitador por IP (IpParaLlave): login y RateLimitingFilter cuentan igual")
    void coincideConLasLlavesDelFiltro() {
        for (String ip : new String[] {"2001:db8:1:2::1", "2001:db8:1:2:aaaa:bbbb:cccc:dddd", "64:ff9b::cb00:7105",
                "::ffff:203.0.113.5", "203.0.113.5", "desconocida"}) {
            assertThat(AuthSupport.prefijoIp(ip)).isEqualTo(com.hotclick.security.IpParaLlave.reducir(ip));
        }
        assertThat(com.hotclick.security.IpParaLlave.clave(null)).isEqualTo("desconocida");
    }
}
