package com.hotclick.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Checkout: tope de 50 productos distintos en el carrito")
class PaymentCheckoutRequestTest {

    private static Validator validator;

    @BeforeAll
    static void validador() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static PaymentCheckoutRequest conItems(int n) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setMetodoEnvio("RETIRO");
        List<PaymentCheckoutRequest.ItemDTO> items = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            PaymentCheckoutRequest.ItemDTO it = new PaymentCheckoutRequest.ItemDTO();
            it.setProductoId((long) i);
            it.setCantidad(1);
            items.add(it);
        }
        r.setItems(items);
        return r;
    }

    private static List<String> mensajesDeItems(PaymentCheckoutRequest r) {
        Set<ConstraintViolation<PaymentCheckoutRequest>> v = validator.validate(r);
        return v.stream().filter(x -> "items".equals(x.getPropertyPath().toString()))
            .map(ConstraintViolation::getMessage).toList();
    }

    @Test
    @DisplayName("50 ítems → válido")
    void cincuentaPasa() {
        assertThat(mensajesDeItems(conItems(50))).isEmpty();
    }

    @Test
    @DisplayName("51 ítems → falla con el mensaje del tope")
    void cincuentaYUnoFalla() {
        assertThat(mensajesDeItems(conItems(51)))
            .containsExactly("El pedido no puede tener más de 50 productos distintos");
    }

    @Test
    @DisplayName("vacío sigue fallando por @NotEmpty")
    void vacioFalla() {
        assertThat(mensajesDeItems(conItems(0))).containsExactly("El carrito no puede estar vacío");
    }
}
