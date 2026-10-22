package com.hotclick.controller;

import com.hotclick.exception.PosMetodoNoDisponibleException;
import com.hotclick.service.PosQrService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("POST /api/pos/qr con SINPE responde 400 con código claro")
class PosQrControllerSinpeTest {

    @Test
    void sinpeEnMetodosPagoDa400ConCodigo() {
        PosQrService qr = mock(PosQrService.class);
        when(qr.crearSesion(any(), any(), any(), any(), any(), any(), any(), any(), any()))
            .thenThrow(new PosMetodoNoDisponibleException("SINPE no disponible"));
        TurnoCajaService turnos = mock(TurnoCajaService.class);
        when(turnos.getTurnoActivo(any())).thenReturn(Optional.empty());
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.extractUserId(any())).thenReturn(1L);
        when(jwt.extractEmpresaId(any())).thenReturn(1L);

        PosQrController c = new PosQrController();
        ReflectionTestUtils.setField(c, "posQrService", qr);
        ReflectionTestUtils.setField(c, "jwtUtil", jwt);
        ReflectionTestUtils.setField(c, "turnoCajaService", turnos);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Authorization")).thenReturn("Bearer x");
        var res = c.crearSesion(Map.of("metodoPago", "TARJETA", "metodosPago", java.util.List.of("SINPE")), req);

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody().toString()).isNotNull();
        var dto = (com.hotclick.dto.ResponseDTO) res.getBody();
        assertThat(dto.isSuccess()).isFalse();
        assertThat(dto.getData()).isEqualTo(Map.of("codigo", PosMetodoNoDisponibleException.CODIGO));
    }
}
