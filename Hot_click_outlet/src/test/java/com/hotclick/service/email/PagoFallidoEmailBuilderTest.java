package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PagoFallidoEmailBuilder — correo de pago fallido (Figma: Correo · Pago fallido)")
class PagoFallidoEmailBuilderTest {

    private final PagoFallidoEmailBuilder builder = new PagoFallidoEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    private Pedido pedido() {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-1052");
        Usuario cliente = new Usuario();
        cliente.setNombre("Andrea");
        p.setUsuarioFinal(cliente);
        return p;
    }

    @Test
    @DisplayName("Muestra el motivo del rechazo y aclara que no hubo cargo")
    void muestraMotivo() {
        String html = builder.buildPagoFallido(pedido(), pedido().getUsuarioFinal(), "El banco rechazó la tarjeta.");
        assertThat(html)
            .contains("ORD-1052")
            .contains("El banco rechazó la tarjeta.")
            .contains("No se hizo ningún cobro");
    }

    @Test
    @DisplayName("Escapa el motivo cuando viene de una integración externa")
    void escapaMotivo() {
        String html = builder.buildPagoFallido(pedido(), pedido().getUsuarioFinal(), "<script>x</script>");
        assertThat(html).doesNotContain("<script>x</script>").contains("&lt;script&gt;");
    }
}
