package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("NP-13 | cobro QR (Tilopay/SINPE) solo con negocio aprobado")
class PosQrNegocioAprobadoTest {

    private static Empresa empresa(String estado) { Empresa e = new Empresa(); e.setEstadoEmpresa(estado); return e; }

    @Test
    void pendienteNoCobraPorQr() {
        assertThatThrownBy(() -> PosQrSessionService.exigirNegocioAprobado(empresa("PENDIENTE_APROBACION")))
            .isInstanceOf(IllegalStateException.class).hasMessage(PosQrSessionService.MSG_NO_APROBADO);
    }

    @Test
    void aprobadoCobra() {
        assertThatCode(() -> PosQrSessionService.exigirNegocioAprobado(empresa("ACTIVO"))).doesNotThrowAnyException();
    }
}
