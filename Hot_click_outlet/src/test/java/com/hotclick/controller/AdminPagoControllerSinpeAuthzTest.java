package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPagoControllerSinpeAuthzTest {

    @Mock private PagoRepository pagoRepository;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private PaymentService paymentService;
    @Mock private CompanyScope companyScope;

    @InjectMocks private AdminPagoController controller;

    @Test
    void confirmarSinpe_otraTienda_devuelve403() {
        when(paymentService.confirmarSinpe(9L))
            .thenThrow(new SecurityException("No tienes permiso para aprobar comprobantes de otra tienda"));

        ResponseEntity<ResponseDTO> resp = controller.confirmarSinpe(9L);

        assertEquals(403, resp.getStatusCode().value());
        assertFalse(resp.getBody().isSuccess());
    }

    @Test
    void rechazarSinpe_propiaCompra_devuelve403() {
        doThrow(new SecurityException("No tienes permiso para aprobar tu propia compra"))
            .when(paymentService).rechazarSinpe(9L, null);

        ResponseEntity<ResponseDTO> resp = controller.rechazarSinpe(9L, null, null);

        assertEquals(403, resp.getStatusCode().value());
        assertFalse(resp.getBody().isSuccess());
    }
}
