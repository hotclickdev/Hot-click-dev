package com.hotclick.controller;

import com.hotclick.model.TurnoCaja;
import com.hotclick.service.PosQrService;
import com.hotclick.service.TurnoCajaService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Regresión E2E-POS-01/02/03 (spec 07-pos-qr-sinpe). */
@ExtendWith(MockitoExtension.class)
@DisplayName("POS QR: turno obligatorio, Tilopay y SINPE manual retirados")
class PosQrControllerPagoTest {

    @Mock PosQrService posQrService;
    @Mock TurnoCajaService turnoCajaService;
    @Mock HttpServletRequest request;
    @Mock com.hotclick.security.JwtUtil jwtUtil;
    PosQrController controller;

    @BeforeEach
    void armar() {
        controller = new PosQrController();
        ReflectionTestUtils.setField(controller, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(controller, "posQrService", posQrService);
        ReflectionTestUtils.setField(controller, "turnoCajaService", turnoCajaService);
    }

    @Test
    @DisplayName("E2E-POS-01: sin turno abierto, POST /api/pos/qr → 400 y no crea sesión")
    void sinTurnoNoCreaQr() {
        when(request.getHeader("Authorization")).thenReturn("Bearer jwt-de-prueba");
        when(jwtUtil.extractUserId("jwt-de-prueba")).thenReturn(7L);
        when(jwtUtil.extractEmpresaId("jwt-de-prueba")).thenReturn(9L);
        when(turnoCajaService.getTurnoActivo(7L)).thenReturn(Optional.empty());
        ResponseEntity<?> r = controller.crearSesion(Map.of("metodoPago", "SINPE", "items", List.of()), request);
        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(((com.hotclick.dto.ResponseDTO) r.getBody()).getMessage()).contains("turno abierto");
        verifyNoInteractions(posQrService);
    }

    @Test
    @DisplayName("E2E-POS-01: con turno abierto se crea con ese turnoId")
    void conTurnoCrea() {
        when(request.getHeader("Authorization")).thenReturn("Bearer jwt-de-prueba");
        when(jwtUtil.extractUserId("jwt-de-prueba")).thenReturn(7L);
        when(jwtUtil.extractEmpresaId("jwt-de-prueba")).thenReturn(9L);
        TurnoCaja t = new TurnoCaja();
        t.setId(55L);
        when(turnoCajaService.getTurnoActivo(7L)).thenReturn(Optional.of(t));
        controller.crearSesion(Map.of("metodoPago", "SINPE", "items", List.of()), request);
        verify(posQrService).crearSesion(eq(7L), eq(9L), eq(55L), any(), any(), any(), any(), any(), any(), eq(false));
    }

    @Test
    @DisplayName("E2E-POS-02: /tilopay y /tilopay/confirmar → 410 (404 si el QR no existe), nunca cobran")
    void tilopayRetirado() {
        when(posQrService.consultarEstado("tokcualquiera01")).thenReturn(Map.of("estado", "PENDIENTE"));
        when(posQrService.consultarEstado("tokinexistente1")).thenThrow(new java.util.NoSuchElementException());
        assertThat(controller.iniciarTilopay("tokinexistente1").getStatusCode().value()).isEqualTo(404);
        assertThat(controller.iniciarTilopay("tokcualquiera01").getStatusCode().value()).isEqualTo(410);
        assertThat(controller.confirmarTilopay("tokcualquiera01").getStatusCode().value()).isEqualTo(410);
        verify(posQrService, never()).crearSesion(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    @DisplayName("E2E-POS-03: confirmar-sinpe manual → 410 y nunca confirma (solo webhook ONVO)")
    void sinpeManualRetirado() {
        assertThat(controller.confirmarSinpe("tokcualquiera01").getStatusCode().value()).isEqualTo(410);
        verifyNoInteractions(posQrService);
    }
}
