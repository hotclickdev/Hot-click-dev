package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.MetodoCobro;
import com.hotclick.service.wallet.CuentaCobroVerificada;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** Ficha de tienda: el aviso de «sin cuenta de cobro aprobada» antes de aprobar. */
class FichaAprobarCuentaCobroTest {

    private SolicitudEmpresaHandler handler(boolean admin, Optional<MetodoCobro> cuenta) {
        SolicitudAdminGuard guard = mock(SolicitudAdminGuard.class);
        when(guard.denyIfNotAdmin()).thenReturn(admin ? null : ResponseEntity.status(403).body(ResponseDTO.error("no")));
        SolicitudEmpresaHandler h = new SolicitudEmpresaHandler(null, null, null, null, guard, null);
        CuentaCobroVerificada c = mock(CuentaCobroVerificada.class);
        when(c.buscar(7L)).thenReturn(cuenta);
        ReflectionTestUtils.setField(h, "cuentaCobroVerificada", c);
        return h;
    }

    @Test
    @SuppressWarnings("unchecked")
    void informaSiTieneCuentaAprobada() {
        var sin = handler(true, Optional.empty()).cuentaCobro(7L);
        assertThat(((Map<String, Object>) sin.getBody().getData()).get("aprobada")).isEqualTo(false);
        var con = handler(true, Optional.of(new MetodoCobro())).cuentaCobro(7L);
        assertThat(((Map<String, Object>) con.getBody().getData()).get("aprobada")).isEqualTo(true);
        assertThat(handler(false, Optional.empty()).cuentaCobro(7L).getStatusCode().value()).isEqualTo(403);
    }
}
