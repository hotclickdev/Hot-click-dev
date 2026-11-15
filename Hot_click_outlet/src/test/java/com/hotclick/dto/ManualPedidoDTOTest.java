package com.hotclick.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Pedido manual del panel: tope de 50 productos distintos")
class ManualPedidoDTOTest {

    private static Validator validator;

    @BeforeAll
    static void validador() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static ManualPedidoDTO conItems(int n) {
        ManualPedidoDTO dto = new ManualPedidoDTO();
        List<ManualPedidoDTO.ItemDTO> items = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            ManualPedidoDTO.ItemDTO it = new ManualPedidoDTO.ItemDTO();
            it.setProductoId((long) i);
            it.setCantidad(1);
            it.setPrecioUnitario(1000);
            items.add(it);
        }
        dto.setItems(items);
        return dto;
    }

    private static List<String> mensajesDeItems(ManualPedidoDTO dto) {
        return validator.validate(dto).stream()
            .filter(v -> "items".equals(v.getPropertyPath().toString()))
            .map(ConstraintViolation::getMessage).toList();
    }

    @Test
    @DisplayName("50 ítems pasa; 51 falla con el mensaje del tope; vacío sigue fallando por @NotEmpty")
    void tope() {
        assertThat(mensajesDeItems(conItems(50))).isEmpty();
        assertThat(mensajesDeItems(conItems(51))).containsExactly("El pedido no puede tener más de 50 productos distintos");
        assertThat(mensajesDeItems(conItems(0))).containsExactly("El pedido debe tener al menos un producto");
    }
}
