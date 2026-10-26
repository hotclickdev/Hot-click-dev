package com.hotclick.service;

import com.hotclick.config.OnvoArranqueProdGuardAcceso;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** P-04 (C3): defaults seguros por código. Sin variable = prod no acepta llave test; sin destino = SINPE apagado. */
class OnvoDefaultsSegurosTest {

    @Test
    void optInLlaveTest_defaultFalseEnProperties() throws Exception {
        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("payments.onvo.permitir-llave-test"))
            .isEqualTo("${PAYMENTS_ONVO_PERMITIR_LLAVE_TEST:false}");
        assertThat(p.getProperty("onvo.sinpe-destino")).isEqualTo("${ONVO_SINPE_DESTINO:}");
    }

    @Test
    void sinDestino_sinpeDesactivadoConAlerta() {
        OnvoService s = new OnvoService(new RestTemplate());
        s.setSinpeDestinoParaTest("");
        assertThat(s.sinpeDestino()).isEmpty();
        assertThat(s.avisarSiFaltaSinpeDestino()).isTrue();
        s.setSinpeDestinoParaTest(null);
        assertThat(s.avisarSiFaltaSinpeDestino()).isTrue();
    }

    @Test
    void guardProd_defaultSinOptInRechazaLlaveTest() {
        assertThat(OnvoArranqueProdGuardAcceso.prodArrancaConLlaveTestSinOptIn()).isFalse();
        assertThat(OnvoArranqueProdGuardAcceso.prodArrancaConLlaveTestConOptIn()).isTrue();
    }
}
