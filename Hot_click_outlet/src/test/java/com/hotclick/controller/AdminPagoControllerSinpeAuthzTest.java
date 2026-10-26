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

    /** P-01: la confirmación manual de SINPE está retirada; nunca toca el pago. */
    @Test
    void confirmarSinpe_retirado_devuelve410SinTocarPago() {
        ResponseEntity<ResponseDTO> resp = controller.confirmarSinpe(9L);

        assertEquals(410, resp.getStatusCode().value());
        assertFalse(resp.getBody().isSuccess());
        org.mockito.Mockito.verifyNoInteractions(paymentService, pagoRepository);
    }

    @Test
    void rechazarSinpe_retirado_devuelve410SinTocarPago() {
        ResponseEntity<ResponseDTO> resp = controller.rechazarSinpe(9L);

        assertEquals(410, resp.getStatusCode().value());
        org.mockito.Mockito.verifyNoInteractions(paymentService, pagoRepository);
    }
}
