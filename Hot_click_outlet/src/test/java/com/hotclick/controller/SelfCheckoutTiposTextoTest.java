package com.hotclick.controller;

import com.hotclick.service.SelfCheckoutService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** LOW de #455: cuerpo público del autoservicio con clienteNombre/clienteTel/notas que no son texto → 400, no 500. */
@DisplayName("Autoservicio — campos de texto con otro tipo dan 400")
class SelfCheckoutTiposTextoTest {

    @ParameterizedTest
    @ValueSource(strings = {"clienteNombre", "clienteTel", "notas"})
    @DisplayName("número, lista u objeto en un campo de texto → 400 sin llegar al servicio")
    void tipoNoTexto_400(String campo) {
        SelfCheckoutService servicio = mock(SelfCheckoutService.class);
        SelfCheckoutController controller = new SelfCheckoutController(servicio);
        for (Object valor : new Object[]{12345, List.of("a"), Map.of("x", 1), true}) {
            Map<String, Object> body = new HashMap<>();
            body.put("items", List.of(Map.of("productoId", 3, "cantidad", 1)));
            body.put(campo, valor);

            var resp = controller.crearPedido("tok", body);

            assertThat(resp.getStatusCode().value()).isEqualTo(400);
            assertThat(String.valueOf(resp.getBody())).contains(campo);
        }
        verify(servicio, never()).crearPedido(any(), any(), any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"clienteNombre", "clienteTel", "notas"})
    @DisplayName("texto o ausente sigue llegando al servicio")
    void textoONulo_ok(String campo) {
        SelfCheckoutService servicio = mock(SelfCheckoutService.class);
        Map<String, Object> body = new HashMap<>();
        body.put("items", List.of(Map.of("productoId", 3, "cantidad", 1)));
        body.put(campo, "Ana");
        assertThat(new SelfCheckoutController(servicio).crearPedido("tok", body).getStatusCode().value()).isEqualTo(200);
    }
}
