package com.hotclick.controller;

import com.hotclick.exception.AutoconfirmacionSinpeException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.service.PosQrService;
import com.hotclick.service.pos.PosQrStockReserva;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.pos.PosSinpeOnvoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("BAJO 4: PosQrController responde mensajes constantes, nunca e.getMessage()")
class PosQrControllerMensajesTest {

    private static final String INTERNO = "detalle interno ONVO req_abc SQL state 23505";

    @Test
    @DisplayName("Crear QR: detalle crudo no sale; stock, datos y tope usan constantes")
    void crear() {
        assertThat(PosQrController.mensajeCrear(new RuntimeException(INTERNO))).isEqualTo(PosQrController.MSG_ERROR_GENERAR_QR);
        assertThat(PosQrController.mensajeCrear(new IllegalStateException(INTERNO))).isEqualTo(PosQrController.MSG_ERROR_GENERAR_QR);
        assertThat(PosQrController.mensajeCrear(new IllegalArgumentException(INTERNO))).isEqualTo(PosQrController.MSG_DATOS_QR_INVALIDOS);
        assertThat(PosQrController.mensajeCrear(new StockInsuficienteException("Mouse", 0, 1))).isEqualTo(PosQrController.MSG_SIN_STOCK_QR);
        assertThat(PosQrController.mensajeCrear(new IllegalStateException(PosQrStockReserva.MSG_TOPE_PENDIENTES)))
            .isEqualTo(PosQrStockReserva.MSG_TOPE_PENDIENTES);
        assertThat(PosQrController.mensajeCrear(new RuntimeException((String) null))).isEqualTo(PosQrController.MSG_ERROR_GENERAR_QR);
    }

    @Test
    @DisplayName("Pago con tarjeta: solo constantes conocidas")
    void tarjeta() {
        assertThat(PosQrController.mensajePagoTarjeta(new IllegalStateException(INTERNO))).isEqualTo(PosQrController.MSG_PAGO_TARJETA_NO_INICIADO);
        assertThat(PosQrController.mensajePagoTarjeta(new IllegalStateException(PosQrVentaService.MSG_TARJETA_NO_DISPONIBLE)))
            .isEqualTo(PosQrVentaService.MSG_TARJETA_NO_DISPONIBLE);
        assertThat(PosQrController.mensajePagoTarjeta(new IllegalStateException(PosQrVentaService.MSG_SINPE_SOLO_ONVO)))
            .isEqualTo(PosQrVentaService.MSG_SINPE_SOLO_ONVO);
    }

    private static PosQrController controller(PosQrService svc) {
        PosQrController c = new PosQrController();
        ReflectionTestUtils.setField(c, "posQrService", svc);
        return c;
    }

    @Test
    @DisplayName("SINPE ONVO 409 y 503: constantes, sin el texto de la excepción")
    void sinpeOnvo() {
        PosQrService svc = mock(PosQrService.class);
        when(svc.iniciarSinpeOnvo(any(), any(), any())).thenThrow(new IllegalStateException(INTERNO));
        ResponseEntity<?> r = controller(svc).iniciarSinpeOnvo("tok", null);
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody()).isEqualTo(Map.of("error", PosQrController.MSG_SINPE_NO_INICIADO));

        PosQrService svc2 = mock(PosQrService.class);
        when(svc2.iniciarSinpeOnvo(any(), any(), any())).thenThrow(new IllegalStateException(PosSinpeOnvoService.MSG_NO_DISPONIBLE));
        ResponseEntity<?> r2 = controller(svc2).iniciarSinpeOnvo("tok", null);
        assertThat(r2.getStatusCode().value()).isEqualTo(503);
        assertThat(r2.getBody()).isEqualTo(Map.of("error", PosSinpeOnvoService.MSG_NO_DISPONIBLE));
    }

    @Test
    @DisplayName("Tilopay 409: constante, sin el texto de la excepción")
    void tilopay() {
        PosQrService svc = mock(PosQrService.class);
        when(svc.iniciarTilopay(any(), any())).thenThrow(new IllegalStateException(INTERNO));
        ResponseEntity<?> r = controller(svc).iniciarTilopay("tok", null);
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody()).isEqualTo(Map.of("error", PosQrController.MSG_PAGO_TARJETA_NO_INICIADO));
    }

    @Test
    @DisplayName("Autoconfirmación SINPE 403: mensaje constante de la excepción y su código")
    void autoconfirmacion() {
        assertThat(AutoconfirmacionSinpeException.MENSAJE).doesNotContain(INTERNO);
        String fuente = leerFuente();
        assertThat(fuente).doesNotContain("ResponseDTO.error(e.getMessage()")
            .doesNotContain("Map.of(\"error\", e.getMessage())")
            .doesNotContain("? detalle\n");
    }

    private static String leerFuente() {
        try {
            return java.nio.file.Files.readString(java.nio.file.Path.of(
                "src/main/java/com/hotclick/controller/PosQrController.java"));
        } catch (java.io.IOException e) {
            throw new AssertionError(e);
        }
    }
}
