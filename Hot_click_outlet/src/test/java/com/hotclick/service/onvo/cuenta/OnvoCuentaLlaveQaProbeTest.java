package com.hotclick.service.onvo.cuenta;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.client.RestTemplate;
import static org.assertj.core.api.Assertions.assertThat;

/** C-5: fuera de prod, una llave live o inválida no llega a ONVO (cliente sin llave, falla cerrado). */
class OnvoCuentaLlaveQaProbeTest {
    private OnvoCuentaConectadaClient elegir(String perfil, String llave) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfil);
        return new OnvoCuentaConectadaConfig().onvoCuentaConectadaClient(env, new RestTemplate(), llave);
    }
    @Test void liveEnDev_fallaCerradoSinLlave() {
        assertThat(elegir("dev", "onvo_live_QAFALSA000").isSimulado()).isFalse();
        assertThat(elegir("dev", "onvo_live_QAFALSA000")).isInstanceOf(OnvoCuentaConectadaHttpClient.class);
    }
    @Test void llaveInvalidaEnProd_usaClienteHttp() {
        assertThat(elegir("prod", "basura")).isInstanceOf(OnvoCuentaConectadaHttpClient.class);
    }
}
