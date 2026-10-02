package com.hotclick.service.email;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SeguimientoEstadoEmailBuilder — correo de seguimiento (Figma: Correo · Seguimiento de estado)")
class SeguimientoEstadoEmailBuilderTest {

    private final SeguimientoEstadoEmailBuilder builder = new SeguimientoEstadoEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    private Pedido pedido(String estado) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-1048");
        pedido.setEstadoPedido(estado);
        pedido.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        Empresa empresa = new Empresa();
        empresa.setNombreComercial("Casa Luna 506");
        pedido.setEmpresa(empresa);
        Usuario cliente = new Usuario();
        cliente.setNombre("Andrea");
        pedido.setUsuarioFinal(cliente);
        return pedido;
    }

    @Test
    @DisplayName("En preparación: título, tienda, cuatro pasos y mensaje de la tienda como en Figma")
    void enPreparacion() {
        Pedido pedido = pedido("EN_PREPARACION");
        String html = builder.buildSeguimientoEstado(pedido, pedido.getUsuarioFinal(), "Lo empacamos hoy.");

        assertThat(html)
            .contains("Tu pedido está en preparación")
            .contains("Casa Luna 506 ya lo está alistando.")
            .contains("Pagado").contains("En preparación").contains("Enviado").contains("Entregado")
            .contains("Mensaje de la tienda")
            .contains("“Lo empacamos hoy.”")
            .contains("Ver mi pedido")
            .contains("/email/icono-caja.png")
            .doesNotContain("display:flex");
        assertThat(builder.asunto(pedido)).isEqualTo("Tu pedido #ORD-1048 está en preparación");
    }

    @Test
    @DisplayName("Estados que Figma no nombra como paso (cancelado) no dibujan los pasos")
    void canceladoSinPasos() {
        Pedido pedido = pedido("CANCELADO");
        String html = builder.buildSeguimientoEstado(pedido, pedido.getUsuarioFinal(), null);

        assertThat(html).contains("Tu pedido fue cancelado").doesNotContain("Entregado");
    }

    @Test
    @DisplayName("Escapa la nota para que no inyecte HTML")
    void escapaNota() {
        Pedido pedido = pedido("EN_PREPARACION");
        String html = builder.buildSeguimientoEstado(pedido, pedido.getUsuarioFinal(), "<script>x</script>");

        assertThat(html).doesNotContain("<script>x</script>").contains("&lt;script&gt;");
    }

    @Test
    @DisplayName("B17: envío normal GAM no se trata como retiro (sin nota de retiro en tienda)")
    void envioNormalNoEsRetiro() {
        Pedido pedido = pedido("EN_PREPARACION");
        pedido.setMetodoEnvio("ENVIO_NORMAL_GAM");
        assertThat(builder.buildSeguimientoEstado(pedido, pedido.getUsuarioFinal(), null))
            .doesNotContain("Retiro en tienda");

        pedido.setMetodoEnvio(Constants.ENVIO_RETIRO);
        assertThat(builder.buildSeguimientoEstado(pedido, pedido.getUsuarioFinal(), null))
            .contains("Retiro en tienda");
    }
}
