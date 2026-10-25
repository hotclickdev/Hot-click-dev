package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("C2 | en prod la app no arranca sin llave onvo_live_ (salvo opt-in de llave test)")
class OnvoArranqueProdGuardTest {

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles(perfiles);
        return e;
    }

    @Test
    void prodSinLlaveOConLlaveRaraNoArranca() {
        for (String k : new String[] {"", "sk_x", "onvo_test_k"}) {
            assertThatThrownBy(() -> new OnvoArranqueProdGuard(env("prod"), k, false).verificar())
                .isInstanceOf(IllegalStateException.class);
        }
        assertThatThrownBy(() -> new OnvoArranqueProdGuard(env("production"), "", true).verificar())
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void prodConLiveOOptInTestArranca() {
        assertThatCode(() -> new OnvoArranqueProdGuard(env("prod"), "onvo_live_k", false).verificar()).doesNotThrowAnyException();
        assertThatCode(() -> new OnvoArranqueProdGuard(env("prod"), "onvo_test_k", true).verificar()).doesNotThrowAnyException();
    }

    @Test
    void fueraDeProdNoExige() {
        assertThatCode(() -> new OnvoArranqueProdGuard(env("dev"), "", false).verificar()).doesNotThrowAnyException();
        assertThatCode(() -> new OnvoArranqueProdGuard(env(), "", false).verificar()).doesNotThrowAnyException();
    }
}
