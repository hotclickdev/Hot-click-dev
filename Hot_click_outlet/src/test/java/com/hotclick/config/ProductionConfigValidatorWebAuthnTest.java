package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ProductionConfigValidator — webauthn.synthetic-id-key fail-closed en prod")
class ProductionConfigValidatorWebAuthnTest {

    private static ProductionConfigValidator validador(String appUrl, String clave) {
        var v = new ProductionConfigValidator();
        ReflectionTestUtils.setField(v, "jwtSecret", "x".repeat(64));
        ReflectionTestUtils.setField(v, "totpEncryptionKey", "a".repeat(64));
        ReflectionTestUtils.setField(v, "appUrl", appUrl);
        ReflectionTestUtils.setField(v, "corsOrigins", "https://hotclick.lat");
        ReflectionTestUtils.setField(v, "s3Bucket", "");
        ReflectionTestUtils.setField(v, "tilopayWebhookSecret", "t".repeat(32)); // valor de test, no real
        ReflectionTestUtils.setField(v, "webauthnSyntheticKey", clave);
        return v;
    }

    @Test
    @DisplayName("prod sin clave → aborta")
    void prodSinClave() {
        assertThatThrownBy(() -> validador("https://hotclick.lat", "").onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("WEBAUTHN_SYNTHETIC_ID_KEY");
    }

    @Test
    @DisplayName("prod con clave corta (<32 bytes) → aborta")
    void prodClaveCorta() {
        String corta = Base64.getEncoder().encodeToString(new byte[16]);
        assertThatThrownBy(() -> validador("https://hotclick.lat", corta).onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("demasiado corta");
    }

    @Test
    @DisplayName("prod con clave válida (32 bytes) → arranca")
    void prodClaveValida() {
        String ok = Base64.getEncoder().encodeToString(new byte[32]);
        assertThatCode(() -> validador("https://hotclick.lat", ok).onApplicationEvent(null)).doesNotThrowAnyException();
    }
}
