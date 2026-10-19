package com.hotclick.controller;

import com.hotclick.service.SinpeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@DisplayName("SINPE fuera de ONVO: la subida de comprobantes responde 410 y no toca el servicio")
class SinpeComprobantesApagadosTest {

    private final SinpeService service = mock(SinpeService.class);
    private final SinpeController controller = new SinpeController();
    private final MockMultipartFile imagen = new MockMultipartFile("imagen", "c.png", "image/png", new byte[] {1});

    SinpeComprobantesApagadosTest() {
        ReflectionTestUtils.setField(controller, "sinpeService", service);
    }

    @Test
    void clienteAutenticadoRecibe410() {
        var res = controller.subirComprobante("HC-1", imagen, "Nombre", null, null);
        assertThat(res.getStatusCode().value()).isEqualTo(410);
        assertThat(res.getBody().getData()).isEqualTo(java.util.Map.of("codigo", SinpeController.CODIGO_COMPROBANTES_APAGADO));
        verifyNoInteractions(service);
    }

    @Test
    void invitadoRecibe410() {
        var res = controller.guestSubirComprobante("HC-1", imagen, "Nombre", "a@b.cr", null, null);
        assertThat(res.getStatusCode().value()).isEqualTo(410);
        verifyNoInteractions(service);
    }
}
