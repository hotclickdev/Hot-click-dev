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
    @DisplayName("Pagos no disponibles → 400, no 500")
    void noDisponible400() {
        when(posQrService.iniciarTilopay("tokentarjetaqr01", "SINPE"))
            .thenThrow(new IllegalStateException("Los pagos en línea no están disponibles."));
        ResponseEntity<?> resp = controller.iniciarTilopay("tokentarjetaqr01", "SINPE");
        assertThat(resp.getStatusCode().value()).isEqualTo(400);
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
}
