package com.hotclick.config;

import com.hotclick.dto.ResponseDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GlobalExceptionHandler — IllegalState")
class GlobalExceptionHandlerIllegalStateTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("Sin causa (regla de negocio) → 400")
    void sinCausa_badRequest() {
        ResponseEntity<ResponseDTO> resp =
                handler.handleIllegalState(new IllegalStateException("Producto no disponible"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().isSuccess()).isFalse();
    }

    @Test
    @DisplayName("Con causa (fallo interno de pago/crypto) → 500")
    void conCausa_internalError() {
        IllegalStateException ex = new IllegalStateException(
                "Stripe no está configurado", new IllegalStateException("STRIPE_SECRET_KEY"));
        ResponseEntity<ResponseDTO> resp = handler.handleIllegalState(ex);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
