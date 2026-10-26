package com.hotclick.config;

import com.hotclick.service.ResetPlataformaKeepQaService;
import com.hotclick.service.TotpSecretEncryptionService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import javax.sql.DataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Perfiles reales de Spring: los componentes dev/test nunca se activan junto a prod/production,
 * y TOTP_ENCRYPTION_KEY es obligatoria (fail-closed) si prod/production está activo.
 */
class PerfilesEstrictosTest {

    private static final String CLAVE_VALIDA =
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

    private ApplicationContextRunner runner(String perfiles) {
        ApplicationContextRunner r = new ApplicationContextRunner()
            .withBean(ResetPlataformaKeepQaService.class, () -> mock(ResetPlataformaKeepQaService.class))
            .withBean(DataSource.class, () -> mock(DataSource.class))
            .withUserConfiguration(ResetPlataformaKeepQaRunner.class, H2TablasNativasSeeder.class);
        return perfiles.isBlank() ? r : r.withPropertyValues("spring.profiles.active=" + perfiles);
    }

    @ParameterizedTest(name = "perfiles=[{0}] → reset={1}, h2={2}")
    @CsvSource(delimiter = ';', value = {
        "dev;true;false",
        "test;false;true",
        "prod;false;false",
        "production;false;false",
        "dev,prod;false;false",
        "dev,production;false;false",
        "test,prod;false;false",
        "test,production;false;false",
        "dev,test;true;true",
        "'';false;false"
    })
    void componentesDevTestSoloSinProd(String perfiles, boolean reset, boolean h2) {
        runner(perfiles).run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(ctx.containsBean("resetPlataformaKeepQaRunner")
                || !ctx.getBeansOfType(ResetPlataformaKeepQaRunner.class).isEmpty()).isEqualTo(reset);
            assertThat(!ctx.getBeansOfType(H2TablasNativasSeeder.class).isEmpty()).isEqualTo(h2);
        });
    }

    private ApplicationContextRunner totp(String perfiles, String clave) {
        ApplicationContextRunner r = new ApplicationContextRunner()
            .withUserConfiguration(TotpSecretEncryptionService.class);
        if (!perfiles.isBlank()) r = r.withPropertyValues("spring.profiles.active=" + perfiles);
        if (clave != null) r = r.withPropertyValues("totp.encryption.key=" + clave);
        return r;
    }

    @ParameterizedTest(name = "TOTP sin clave, perfiles=[{0}] → arranca={1}")
    @CsvSource(delimiter = ';', value = {
        "dev;true",
        "test;true",
        "dev,test;true",
        "prod;false",
        "production;false",
        "dev,prod;false",
        "test,production;false",
        "dev,test,prod;false",
        "'';false"
    })
    void totpSinClaveFallaCerradoConProd(String perfiles, boolean arranca) {
        totp(perfiles, null).run(ctx -> {
            if (arranca) {
                assertThat(ctx).hasNotFailed().hasSingleBean(TotpSecretEncryptionService.class);
            } else {
                assertThat(ctx).hasFailed();
                assertThat(ctx.getStartupFailure()).rootCause()
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("TOTP_ENCRYPTION_KEY");
            }
        });
    }

    @ParameterizedTest(name = "TOTP con clave válida, perfiles=[{0}] → ok")
    @CsvSource({"prod", "production", "'dev,prod'", "'test,production'", "dev"})
    void totpConClaveValidaArranca(String perfiles) {
        totp(perfiles, CLAVE_VALIDA).run(ctx -> {
            assertThat(ctx).hasNotFailed();
            TotpSecretEncryptionService svc = ctx.getBean(TotpSecretEncryptionService.class);
            assertThat(svc.decrypt(svc.encrypt("JBSWY3DPEHPK3PXP"))).isEqualTo("JBSWY3DPEHPK3PXP");
        });
    }

    @ParameterizedTest(name = "TOTP con clave inválida, perfiles=[{0}] → falla al arrancar")
    @CsvSource({"prod", "'dev,prod'", "dev", "test"})
    void totpConClaveInvalidaFalla(String perfiles) {
        totp(perfiles, "abcd").run(ctx -> assertThat(ctx).hasFailed());
    }
}
