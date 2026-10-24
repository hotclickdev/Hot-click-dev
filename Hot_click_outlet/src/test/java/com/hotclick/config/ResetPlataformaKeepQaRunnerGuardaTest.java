package com.hotclick.config;

import com.hotclick.service.ResetPlataformaKeepQaService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** El vaciado de plataforma solo se carga con perfil dev (sin prod/production/staging) y la propiedad en true. */
class ResetPlataformaKeepQaRunnerGuardaTest {

    private static final String PROP = "hotclick.reset-plataforma.enabled";

    private ApplicationContextRunner runner(String perfiles, String... props) {
        return new ApplicationContextRunner()
                .withBean(ResetPlataformaKeepQaService.class, () -> mock(ResetPlataformaKeepQaService.class))
                .withUserConfiguration(ResetPlataformaKeepQaRunner.class)
                .withPropertyValues("spring.profiles.active=" + perfiles)
                .withPropertyValues(props);
    }

    @Test
    void cargaConDevYPropiedadTrue() {
        runner("dev", PROP + "=true").run(ctx -> assertThat(ctx).hasSingleBean(ResetPlataformaKeepQaRunner.class));
    }

    @Test
    void noCargaSinPropiedad() {
        runner("dev").run(ctx -> assertThat(ctx).doesNotHaveBean(ResetPlataformaKeepQaRunner.class));
    }

    @Test
    void noCargaConPropiedadFalse() {
        runner("dev", PROP + "=false").run(ctx -> assertThat(ctx).doesNotHaveBean(ResetPlataformaKeepQaRunner.class));
    }

    @Test
    void noCargaConDevProdNiProductionNiStaging() {
        for (String p : new String[]{"dev,prod", "dev,production", "dev,staging", "prod", "default"}) {
            runner(p, PROP + "=true").run(ctx ->
                    assertThat(ctx).as(p).doesNotHaveBean(ResetPlataformaKeepQaRunner.class));
        }
    }
}
