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
}
