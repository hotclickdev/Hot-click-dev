package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/** QA5 ALTO: la tienda paga por ONVO; el alta sin pasarela queda solo para efectivo, y cancelar nunca da 500. */
class StorefrontPagoOnvoTest {

    @Test
    void altaSinPasarela_soloEfectivo_sinpeSoloConConfig() {
        assertThat(StorefrontController.metodoSinPasarelaPermitido("EFECTIVO", false)).isTrue();
        assertThat(StorefrontController.metodoSinPasarelaPermitido("SINPE_MOVIL", false)).isFalse();
        assertThat(StorefrontController.metodoSinPasarelaPermitido("TRANSFERENCIA", false)).isFalse();
        assertThat(StorefrontController.metodoSinPasarelaPermitido(null, false)).isFalse();
        assertThat(StorefrontController.metodoSinPasarelaPermitido("SINPE_MOVIL", true)).isTrue();
        assertThat(StorefrontController.metodoSinPasarelaPermitido("TRANSFERENCIA", true)).isFalse();
    }

    private PaymentController controller(RuntimeException error) {
        PaymentService service = mock(PaymentService.class);
        doThrow(error).when(service).cancelarAnon("ORD-1", "t");
        PaymentController c = new PaymentController();
        ReflectionTestUtils.setField(c, "paymentService", service);
        return c;
    }

    @Test
    void cancelarInvitado_pedidoInexistente_404() {
        var r = controller(RecursoNoEncontradoException.conDetalle("Pedido no encontrado", "x"))
            .guestCancelarPedido("ORD-1", Map.of("cancelToken", "t"));
        assertThat(r.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void cancelarInvitado_yaProcesado_409() {
        var r = controller(new IllegalStateException("ya procesado"))
            .guestCancelarPedido("ORD-1", Map.of("cancelToken", "t"));
        assertThat(r.getStatusCode().value()).isEqualTo(409);
    }

    @Test
    void cancelarInvitado_errorInesperado_nunca500() {
        var r = controller(new RuntimeException("boom"))
            .guestCancelarPedido("ORD-1", Map.of("cancelToken", "t"));
        assertThat(r.getStatusCode().value()).isEqualTo(409);
    }
}
