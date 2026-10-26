package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SINPE | sin número de plataforma por defecto; sin número del comercio no hay instrucción")
class SinpeDestinoSinDefaultTest {

    @Test
    void propertySinDefault() throws Exception {
        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        // Valor exacto "${ONVO_SINPE_DESTINO:}": cualquier cosa tras ':' sería un número por defecto.
        assertThat(p.getProperty("onvo.sinpe-destino")).isEqualTo("${ONVO_SINPE_DESTINO:}");
    }

    @Test
    void comercioSinNumeroNoDaInstruccion() {
        assertThat(PosQrSessionService.numeroSinpe(new Empresa())).isEmpty();
        assertThat(PosQrSessionService.numeroSinpe(null)).isEmpty();
    }

    @Test
    void usaNumeroDelComercio() {
        Empresa e = new Empresa();
        e.setTelefonoEmpresa(" 00000000 ");
        assertThat(PosQrSessionService.numeroSinpe(e)).isEqualTo("00000000");
    }
}
