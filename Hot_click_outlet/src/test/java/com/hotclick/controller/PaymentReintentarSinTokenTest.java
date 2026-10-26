package com.hotclick.controller;

import com.hotclick.payment.PaymentSession;
import com.hotclick.service.payment.TilopayConfirmacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/** H-07: tilopay/reintentar es permitAll; la respuesta no debe incluir el sdkToken. */
@ExtendWith(MockitoExtension.class)
class PaymentReintentarSinTokenTest {

    @Mock TilopayConfirmacionService tilopayConfirmacionService;
    @InjectMocks PaymentController controller;

    @Test
    void reintentarNoDevuelveSdkToken() {
        when(tilopayConfirmacionService.reintentar("HC-3001", null, "tok-invitado"))
            .thenReturn(new PaymentSession("HC-3001-R2", "https://pago.example/r", "tok-falso-test", true));

        var res = controller.reintentarTilopay("HC-3001", Map.of("cancelToken", "tok-invitado"));

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked") Map<String, Object> data = (Map<String, Object>) res.getBody().getData();
        assertThat(data).doesNotContainKey("sdkToken");
        assertThat(data.toString()).doesNotContain("tok-falso-test");
        assertThat(data).containsEntry("orderNumber", "HC-3001-R2").containsEntry("modoEmbebido", true);
    }

    @Test
    void noDuenioRecibe404Uniforme() {
        when(tilopayConfirmacionService.reintentar("HC-3001", null, null))
            .thenThrow(new com.hotclick.exception.RecursoNoEncontradoException("Pedido no encontrado"));

        var res = controller.reintentarTilopay("HC-3001", null);

        assertThat(res.getStatusCode().value()).isEqualTo(404);
        assertThat(res.getBody().getMessage()).isEqualTo("Pedido no encontrado");
    }
}
