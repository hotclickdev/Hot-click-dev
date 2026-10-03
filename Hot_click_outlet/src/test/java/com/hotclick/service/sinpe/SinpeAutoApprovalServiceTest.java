package com.hotclick.service.sinpe;

import com.hotclick.service.PaymentService;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class SinpeAutoApprovalServiceTest {

    @Test
    void noApruebaComprobantesNiDependeDelPago() {
        assertFalse(Arrays.stream(SinpeAutoApprovalService.class.getDeclaredFields())
                .anyMatch(campo -> campo.getType().equals(PaymentService.class)));
        assertDoesNotThrow(() -> new SinpeAutoApprovalService().autoAprobarExpirados());
    }
}
