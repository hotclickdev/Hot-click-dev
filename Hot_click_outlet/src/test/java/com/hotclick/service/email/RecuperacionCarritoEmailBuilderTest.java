package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RecuperacionCarritoEmailBuilder — correo de carrito abandonado (Figma: Correo · Recuperación de carrito)")
class RecuperacionCarritoEmailBuilderTest {

    private final RecuperacionCarritoEmailBuilder builder = new RecuperacionCarritoEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    private CarritoAbandonadoRequestDTO.CartItemDTO item(String nombre, int precio, int cantidad) {
        CarritoAbandonadoRequestDTO.CartItemDTO item = new CarritoAbandonadoRequestDTO.CartItemDTO();
        item.setNombre(nombre);
        item.setPrecio(precio);
        item.setCantidad(cantidad);
        return item;
    }

    @Test
    @DisplayName("Muestra los productos, el botón al carrito y el asunto de Figma")
    void estructuraDeFigma() {
        String html = builder.buildRecuperacionCarrito("tok123", List.of(item("Sofá de sala dos plazas", 17500, 1)), "https://hotclick.lat");

        assertThat(html)
            .contains("Tus productos te esperan")
            .contains("Guardamos tu carrito para que termines la compra cuando quieras.")
            .contains("Sofá de sala dos plazas")
            .contains("₡17.500")
            .contains("Volver a mi carrito")
            .contains("https://hotclick.lat/recuperar-carrito/tok123")
            .contains("/email/icono-carrito.png");
        assertThat(RecuperacionCarritoEmailBuilder.ASUNTO).isEqualTo("Tus productos te esperan en HotClick");
    }

    @Test
    @DisplayName("Escapa el nombre del producto")
    void escapaNombre() {
        String html = builder.buildRecuperacionCarrito("t", List.of(item("<script>x</script>", 1000, 2)), "https://hotclick.lat");

        assertThat(html).doesNotContain("<script>x</script>").contains("&lt;script&gt;").contains("2 unidades");
    }
}
