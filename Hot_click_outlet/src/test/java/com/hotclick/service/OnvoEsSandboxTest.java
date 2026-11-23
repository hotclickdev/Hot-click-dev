package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OnvoService.esSandbox: fail-closed para canales nuevos (Telegram)")
class OnvoEsSandboxTest {

    private OnvoService con(String llave, String... perfiles) {
        OnvoService s = new OnvoService(new org.springframework.web.client.RestTemplate());
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfiles);
        ReflectionTestUtils.setField(s, "environment", env);
        ReflectionTestUtils.setField(s, "secretKey", llave);
        ReflectionTestUtils.setField(s, "permitirLlaveTest", true);
        s.init();
        return s;
    }

    @Test
    void llaveDePruebaEsSandbox() {
        assertThat(con("onvo_test_secret_key_abc", "staging").esSandbox()).isTrue();
    }

    @Test
    void modoSimuladoDeDevEsSandbox() {
        assertThat(con("", "dev").esSandbox()).isTrue();
    }

    @Test
    void llaveLiveNuncaEsSandbox() {
        assertThat(con("onvo_live_secret_key_abc", "prod").esSandbox()).isFalse();
    }

    @Test
    void sinLlaveFueraDeDevNoEsSandbox() {
        assertThat(con("", "prod").esSandbox()).isFalse();
    }
}
