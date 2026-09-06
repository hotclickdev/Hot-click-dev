package com.hotclick.controller;

import com.hotclick.service.PosQrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("POST /pos/qr/pago/{token}/stripe")
class PosQrControllerPagoTest {

    @Mock PosQrService posQrService;
    PosQrController controller;

    @BeforeEach
    void armar() {
        controller = new PosQrController();
        ReflectionTestUtils.setField(controller, "posQrService", posQrService);
    }

    @Test
    @DisplayName("ONVO no configurado o validación → 400, no 500")
    void onvoNoConfiguradoNoEs500() {
        when(posQrService.crearStripeCheckout("tokentarjetaqr01"))
            .thenThrow(new IllegalStateException(
                "ONVO no está configurado. Añade ONVO_SECRET_KEY para cobrar con tarjeta en el POS."));

        ResponseEntity<?> resp = controller.iniciarStripe("tokentarjetaqr01");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        assertThat(cuerpo(resp)).containsEntry("error",
            "ONVO no está configurado. Añade ONVO_SECRET_KEY para cobrar con tarjeta en el POS.");
    }

    @Test
    @DisplayName("QR inexistente → 404")
    void qrInexistente404() {
        when(posQrService.crearStripeCheckout("tokendescconocido"))
            .thenThrow(new NoSuchElementException("QR no encontrado"));

        ResponseEntity<?> resp = controller.iniciarStripe("tokendescconocido");

        assertThat(resp.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("Fallo inesperado → 500 sin filtrar el detalle interno al cliente")
    void falloInesperado500SinDetalle() {
        when(posQrService.crearStripeCheckout("tokentarjetaqr01"))
            .thenThrow(new RuntimeException("secret leaked"));

        ResponseEntity<?> resp = controller.iniciarStripe("tokentarjetaqr01");

        assertThat(resp.getStatusCode().value()).isEqualTo(500);
        assertThat(String.valueOf(resp.getBody())).doesNotContain("secret leaked");
        assertThat(cuerpo(resp)).containsEntry("error", "Error al iniciar pago");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> cuerpo(ResponseEntity<?> resp) {
        return (Map<String, Object>) resp.getBody();
    }
}
