package com.hotclick.service.onvo.cuenta;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Mock de cuentas conectadas solo con perfil dev/test estricto")
class OnvoCuentaConectadaConfigTest {

    @ParameterizedTest(name = "perfiles=[{0}] llave=[{1}] → simulado={2}")
    @CsvSource(delimiter = ';', value = {
        "test;;true",
        "dev;;true",
        "test,prod;;false",
        "test,PROD;;false",
        "dev,Production;;false",
        "prod;;false",
        "PROD;;false",
        "default;;false",
        ";;false",
        "test;onvo_test_secret_key_x;false"
    })
    void eligeCliente(String perfiles, String llave, boolean simulado) {
        MockEnvironment env = new MockEnvironment();
        if (perfiles != null) env.setActiveProfiles(perfiles.split(","));
        OnvoCuentaConectadaClient c = new OnvoCuentaConectadaConfig()
            .onvoCuentaConectadaClient(env, new RestTemplate(), llave == null ? "" : llave);
        assertThat(c.isSimulado()).isEqualTo(simulado);
        assertThat(c instanceof OnvoCuentaConectadaMockClient).isEqualTo(simulado);
    }
}
