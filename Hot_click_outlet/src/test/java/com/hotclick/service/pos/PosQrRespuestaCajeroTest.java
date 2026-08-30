package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Respuesta del cajero al crear QR POS")
class PosQrRespuestaCajeroTest {

    private final PosQrSessionService service = new PosQrSessionService();

    @Test
    @DisplayName("Incluye token, total y método para armar el QR")
    void incluyeTokenTotalYMetodo() {
        Empresa empresa = new Empresa();
        empresa.setNumeroWhatsapp("50688881111");

        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken("tokentarjetaqr01");
        sesion.setTotal(5000);
        sesion.setMetodoPago("TARJETA");
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(30));
        sesion.setEmpresa(empresa);

        Map<String, Object> r = service.respuestaCajero(sesion);

        assertThat(r.get("token")).isEqualTo("tokentarjetaqr01");
        assertThat(r.get("total")).isEqualTo(5000);
        assertThat(r.get("metodoPago")).isEqualTo("TARJETA");
        assertThat(r.get("sinpeNumero")).isEqualTo("50688881111");
        assertThat(r.get("expiracion")).isNotNull();
    }
}
