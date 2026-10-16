package com.hotclick.security.staging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("StagingAuthGuard — el camino HS256 de staging no puede activarse fuera de staging")
class StagingAuthGuardTest {

    private static final String SECRETO = "s".repeat(40);

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles(perfiles);
        return e;
    }

    @Test
    void default_sin_variables_no_registra() {
        assertThat(StagingAuthGuard.validar(env())).isFalse();
    }

    @Test
    void default_con_secreto_o_enabled_no_arranca() {
        assertThatThrownBy(() -> StagingAuthGuard.validar(env().withProperty("STAGING_JWT_SECRET", SECRETO)))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StagingAuthGuard.validar(env().withProperty("STAGING_AUTH_ENABLED", "true")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void prod_con_variables_no_arranca_y_staging_mas_prod_tampoco() {
        assertThat(StagingAuthGuard.validar(env("prod"))).isFalse();
        assertThatThrownBy(() -> StagingAuthGuard.validar(env("prod")
                .withProperty("STAGING_AUTH_ENABLED", "true").withProperty("STAGING_JWT_SECRET", SECRETO)))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StagingAuthGuard.validar(env("staging", "prod")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void staging_incompleto() {
        assertThat(StagingAuthGuard.validar(env("staging"))).isFalse();
        assertThat(StagingAuthGuard.validar(env("staging").withProperty("STAGING_JWT_SECRET", SECRETO))).isFalse();
        assertThatThrownBy(() -> StagingAuthGuard.validar(env("staging").withProperty("STAGING_AUTH_ENABLED", "true")))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StagingAuthGuard.validar(env("staging")
                .withProperty("STAGING_AUTH_ENABLED", "true").withProperty("STAGING_JWT_SECRET", "corto")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void staging_completo_registra() {
        assertThat(StagingAuthGuard.validar(env("staging")
            .withProperty("STAGING_AUTH_ENABLED", "true").withProperty("STAGING_JWT_SECRET", SECRETO))).isTrue();
    }
}
