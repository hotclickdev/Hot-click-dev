package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.PosQrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("PUT /pos/qr/{token}/confirmar-sinpe apagado (SINPE solo en la pasarela)")
class PosQrControllerConfirmarSinpeTest {

    @Mock PosQrService posQrService;
    PosQrController controller;

    @BeforeEach
    void armar() {
        controller = new PosQrController();
        ReflectionTestUtils.setField(controller, "posQrService", posQrService);
    }

    @Test
    @DisplayName("Responde 410 con codigo estable y no toca el servicio (sin pedido, sin cambio de estado)")
    void responde410SinEfectos() {
        ResponseEntity<?> resp = controller.confirmarSinpe("tokencarrito01", Map.of("notas", "x"),
            new MockHttpServletRequest());

        assertThat(resp.getStatusCode().value()).isEqualTo(410);
        ResponseDTO body = (ResponseDTO) resp.getBody();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getData()).isEqualTo(Map.of("codigo", "POS_CONFIRMAR_SINPE_NO_DISPONIBLE"));
        verifyNoInteractions(posQrService);
    }
}
