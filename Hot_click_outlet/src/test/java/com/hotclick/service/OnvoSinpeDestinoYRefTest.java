package com.hotclick.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OnvoSinpeDestinoYRefTest {

    @Test
    void destinoVacioOInvalidoQuedaVacio() {
        OnvoService s = new OnvoService(new RestTemplate());
        s.setSinpeDestinoParaTest(null);
        assertThat(s.sinpeDestino()).isEmpty();
        s.setSinpeDestinoParaTest("<numero-destino-onvo>");
        assertThat(s.sinpeDestino()).isEmpty();
        s.setSinpeDestinoParaTest("12");
        assertThat(s.sinpeDestino()).isEmpty();
    }

    @Test
    void destinoConFormaDeTelefonoSePublicaSinEspacios() {
        OnvoService s = new OnvoService(new RestTemplate());
        String placeholder = "0000-0000"; // placeholder evidente, no es un número real
        s.setSinpeDestinoParaTest(placeholder);
        assertThat(s.sinpeDestino()).isEqualTo("00000000");
    }

    @Test
    void sinpeRefSeTomaSoloDelIntentCorrecto() {
        String ref = "R".repeat(25);
        Map<String, Object> body = Map.of("data", List.of(
            Map.of("paymentIntentId", "pi_otro", "SINPERefNumber", "X".repeat(25)),
            Map.of("paymentIntentId", "pi_1", "SINPERefNumber", ref)));
        assertThat(OnvoService.sinpeRefDeLista(body, "pi_1")).isEqualTo(ref);
        assertThat(OnvoService.sinpeRefDeLista(body, "pi_x")).isNull();
        assertThat(OnvoService.sinpeRefDeLista(Map.of(), "pi_1")).isNull();
        assertThat(OnvoService.sinpeRefDeLista(Map.of("data", List.of(
            Map.of("paymentIntentId", "pi_1", "SINPERefNumber", "R".repeat(26)))), "pi_1")).isNull();
    }

    @Test
    void sinLlaveNoConsultaNiLanza() {
        assertThat(new OnvoService(new RestTemplate()).sinpeRefNumberDe("pi_1")).isNull();
    }
}
