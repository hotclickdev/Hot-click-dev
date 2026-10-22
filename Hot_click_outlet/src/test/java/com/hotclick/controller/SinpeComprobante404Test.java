package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.SinpeService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** H-07 r3 (O-1): pedido inexistente en comprobante invitado -> 404 con mensaje fijo, no 500. */
class SinpeComprobante404Test {
    @Test
    void inexistente404() throws Exception {
        SinpeController ctrl = mock(SinpeController.class, withSettings().defaultAnswer(CALLS_REAL_METHODS));
        SinpeService svc = mock(SinpeService.class);
        doThrow(new RecursoNoEncontradoException("Pedido no encontrado"))
            .when(svc).subirComprobante(anyString(), any(), any(), any(), any(), any());
        ReflectionTestUtils.setField(ctrl, "sinpeService", svc);
        var img = new MockMultipartFile("imagen", "c.png", "image/png", new byte[]{1});
        var res = ctrl.guestSubirComprobante("HC-<x>", img, "X", "a@example.com", null, null);
        assertThat(res.getStatusCode().value()).isEqualTo(404);
        assertThat(res.getBody().getMessage()).isEqualTo("Pedido no encontrado");
    }
}
