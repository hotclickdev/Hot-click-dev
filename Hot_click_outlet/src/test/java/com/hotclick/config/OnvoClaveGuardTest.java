package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/** La llave de prueba (valor ficticio, no es un secreto real) solo arranca con dev/test estricto. */
@DisplayName("ONVO: llave onvo_test_ rechazada fuera de dev/test estricto")
class OnvoClaveGuardTest {

    private static final String LLAVE_PRUEBA_FICTICIA = "onvo_test_" + "ficticia";

    private ApplicationContextRunner runner(String llave, String perfiles) {
        ApplicationContextRunner r = new ApplicationContextRunner()
            .withUserConfiguration(OnvoClaveGuard.class)
            .withPropertyValues("onvo.secret-key=" + llave);
        return perfiles.isEmpty() ? r : r.withPropertyValues("spring.profiles.active=" + perfiles);
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "production", "dev,prod", "test,production", "staging", ""})
    void llaveDePruebaFallaAlArrancar(String perfiles) {
        runner(LLAVE_PRUEBA_FICTICIA, perfiles).run(ctx -> {
            assertThat(ctx).hasFailed();
            assertThat(ctx.getStartupFailure()).rootCause()
                .hasMessageContaining("llave de prueba")
                .hasMessageNotContaining(LLAVE_PRUEBA_FICTICIA);
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev", "test"})
    void llaveDePruebaArrancaEnDevTestEstricto(String perfiles) {
        runner(LLAVE_PRUEBA_FICTICIA, perfiles).run(ctx -> assertThat(ctx).hasNotFailed());
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "dev,prod"})
    void sinLlaveOLlaveLiveArranca(String perfiles) {
        runner("", perfiles).run(ctx -> assertThat(ctx).hasNotFailed());
        runner("onvo_live_" + "ficticia", perfiles).run(ctx -> assertThat(ctx).hasNotFailed());
    }
}
