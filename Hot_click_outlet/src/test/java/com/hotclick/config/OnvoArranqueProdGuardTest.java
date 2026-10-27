package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("C2 | en prod la app no arranca sin llave onvo_live_ (salvo opt-in de llave test)")
class OnvoArranqueProdGuardTest {

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles(perfiles);
        return OnvoArranqueProdGuardAcceso.conConfigBilling(e);
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

    private static final String[][] VARIABLES = {
        {"PLANES_MONEDA", "hotclick.planes.moneda"},
        {"EMPRENDEDOR_PRECIO_MENSUAL_USD", "hotclick.planes.emprendedor.precio-mensual-usd"},
        {"PYME_PRECIO_MENSUAL_USD", "hotclick.planes.pyme.precio-mensual-usd"},
        {"NEGOCIO_PLUS_PRECIO_MENSUAL_USD", "hotclick.planes.negocio-plus.precio-mensual-usd"},
        {"ONVO_PRICE_ID_PYME", "onvo.price-id.pyme"},
        {"ONVO_PRICE_ID_NEGOCIO_PLUS", "onvo.price-id.negocio-plus"},
    };

    @Test
    @DisplayName("prod: falta cualquiera de PLANES_MONEDA, *_PRECIO_MENSUAL_USD o ONVO_PRICE_ID_* → no arranca y nombra la variable")
    void prodSinConfigBillingNoArrancaYNombraLaVariable() {
        for (String[] v : VARIABLES) {
            for (String valor : new String[] {null, "", "   "}) {
                MockEnvironment e = envSin(v[1], valor);
                assertThatThrownBy(() -> new OnvoArranqueProdGuard(e, "onvo_live_k", false).verificar())
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining(v[0]);
            }
        }
    }

    /** Prod con toda la config salvo {@code propiedad}: ausente (valor null) o con el valor dado. */
    private static MockEnvironment envSin(String propiedad, String valor) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles("prod");
        OnvoArranqueProdGuardAcceso.conConfigBillingExcepto(e, propiedad);
        if (valor != null) e.setProperty(propiedad, valor);
        return e;
    }

    @Test
    @DisplayName("prod: precio 0, negativo o mal escrito cuenta como faltante y se nombra la variable")
    void precioInvalidoNoArranca() {
        for (String malo : new String[] {"0", "-5", "abc", "0.00"}) {
            MockEnvironment e = env("prod");
            e.setProperty("hotclick.planes.pyme.precio-mensual-usd", malo);
            assertThatThrownBy(() -> new OnvoArranqueProdGuard(e, "onvo_live_k", false).verificar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PYME_PRECIO_MENSUAL_USD");
        }
    }

    @Test
    @DisplayName("prod: si faltan varias, el mensaje las nombra todas y no muestra ningún valor")
    void mensajeNombraTodasSinValores() {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles("prod");
        e.setProperty("hotclick.planes.pyme.precio-mensual-usd", "24.50");
        e.setProperty("onvo.price-id.pyme", "price_secreto_123");
        Logger logger = (Logger) LoggerFactory.getLogger(OnvoArranqueProdGuard.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            assertThatThrownBy(() -> new OnvoArranqueProdGuard(e, "onvo_live_k", false).verificar())
                .isInstanceOf(IllegalStateException.class)
                .satisfies(ex -> {
                    assertThat(ex.getMessage()).contains("PLANES_MONEDA", "EMPRENDEDOR_PRECIO_MENSUAL_USD",
                        "NEGOCIO_PLUS_PRECIO_MENSUAL_USD", "ONVO_PRICE_ID_NEGOCIO_PLUS");
                    assertThat(ex.getMessage()).doesNotContain("PYME_PRECIO_MENSUAL_USD", "ONVO_PRICE_ID_PYME")
                        .doesNotContain("24.50").doesNotContain("price_secreto_123").doesNotContain("onvo_live_k");
                });
        } finally {
            logger.detachAppender(appender);
        }
        assertThat(appender.list).isNotEmpty().allSatisfy(ev ->
            assertThat(ev.getFormattedMessage()).doesNotContain("24.50").doesNotContain("price_secreto_123"));
    }

    @Test
    @DisplayName("fuera de prod no exige la configuración de billing")
    void fueraDeProdNoExigeConfigBilling() {
        MockEnvironment dev = new MockEnvironment();
        dev.setActiveProfiles("dev");
        assertThatCode(() -> new OnvoArranqueProdGuard(dev, "", false).verificar()).doesNotThrowAnyException();
    }
}
