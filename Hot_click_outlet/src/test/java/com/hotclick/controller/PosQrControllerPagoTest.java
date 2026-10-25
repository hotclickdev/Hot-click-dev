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
@DisplayName("POST /pos/qr/pago/{token}/tilopay")
class PosQrControllerPagoTest {

    @Mock PosQrService posQrService;
    PosQrController controller;

    @BeforeEach
    void armar() {
        controller = new PosQrController();
        ReflectionTestUtils.setField(controller, "posQrService", posQrService);
    }

    @Test
    @DisplayName("ALTO 3: tarjeta por QR no disponible → 503; otro rechazo → 409, nunca 500")
    void noDisponible400() {
        when(posQrService.iniciarTilopay("tokentarjetaqr01", "TARJETA"))
            .thenThrow(new IllegalStateException(com.hotclick.service.pos.PosQrVentaService.MSG_TARJETA_NO_DISPONIBLE));
        assertThat(controller.iniciarTilopay("tokentarjetaqr01", "TARJETA").getStatusCode().value()).isEqualTo(503);
        when(posQrService.iniciarTilopay("tokentarjetaqr01", "SINPE"))
            .thenThrow(new IllegalStateException("otro"));
        assertThat(controller.iniciarTilopay("tokentarjetaqr01", "SINPE").getStatusCode().value()).isEqualTo(409);
    }

    @Test
    @DisplayName("QR inexistente → 404")
    void qrInexistente404() {
        when(posQrService.iniciarTilopay("tokendescconocido", null))
            .thenThrow(new NoSuchElementException("QR no encontrado"));
        assertThat(controller.iniciarTilopay("tokendescconocido", null).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("Tilopay no iniciado → el log enmascara el token del QR")
    void logNoContieneToken() {
        ch.qos.logback.classic.Logger logger =
            (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(PosQrController.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> app =
            new ch.qos.logback.core.read.ListAppender<>();
        app.start();
        logger.addAppender(app);
        try {
            when(posQrService.iniciarTilopay("tokensecretoqr99", null))
                .thenThrow(new IllegalStateException("Los pagos en línea no están disponibles."));
            controller.iniciarTilopay("tokensecretoqr99", null);
        } finally {
            logger.detachAppender(app);
        }
        assertThat(app.list).isNotEmpty();
        assertThat(app.list).allSatisfy(ev -> assertThat(ev.getFormattedMessage())
            .doesNotContain("tokensecretoqr99").doesNotContain("secretoqr99"));
        assertThat(app.list.get(0).getFormattedMessage()).contains("toke****");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> cuerpo(ResponseEntity<?> resp) {
        return (Map<String, Object>) resp.getBody();
    }

    @Test
    @DisplayName("SINPE ONVO: el 400 trae un mensaje constante, nunca el detalle de la excepción")
    void sinpe400MensajeConstante() {
        when(posQrService.iniciarSinpeOnvo("tokensinpeqr0001", "x", 1))
            .thenThrow(new IllegalArgumentException("detalle interno sk_live_filtrado"));
        ResponseEntity<?> resp = controller.iniciarSinpeOnvo("tokensinpeqr0001", new PosQrController.SinpeOnvoRequest("x", 1));
        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        assertThat(resp.getBody().toString()).doesNotContain("detalle interno")
            .contains(com.hotclick.service.pos.PosSinpeOnvoService.MSG_IDENTIFICACION);
    }
}
