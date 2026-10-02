package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("NotificacionGuiaEmailBuilder — correo de guía (Figma: Correo · Guía asignada)")
class NotificacionGuiaEmailBuilderTest {

    private final NotificacionGuiaEmailBuilder builder = new NotificacionGuiaEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    private Pedido pedido(String guia, String urlTracking, String nombreCliente) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-10482");
        p.setNumeroGuia(guia);
        p.setUrlTracking(urlTracking);
        Usuario cliente = new Usuario();
        cliente.setNombre(nombreCliente);
        p.setUsuarioFinal(cliente);
        return p;
    }

    @Test
    @DisplayName("Muestra la guía de Correos de Costa Rica cuando no hay tracking externo")
    void guiaCorreosCr() {
        Pedido p = pedido("RR123456789CR", null, "Andrea");
        String html = builder.buildNotificacionGuia(p, p.getUsuarioFinal());

        assertThat(html)
            .contains("RR123456789CR")
            .contains("Correos de Costa Rica")
            .contains("ORD-10482")
            .contains("rastreo.correos.go.cr");
    }

    @Test
    @DisplayName("Enlaza al seguimiento público con el token del pedido; sin token cae a Mis pedidos")
    void enlazaSeguimientoPublico() {
        Pedido p = pedido("RR123456789CR", null, "Andrea");
        String token = com.hotclick.utils.TokenSeguimientoPedido.generar();
        p.setTokenSeguimiento(token);
        assertThat(builder.buildNotificacionGuia(p, p.getUsuarioFinal()))
            .contains("https://hotclick.lat/seguimiento/" + token);

        p.setTokenSeguimiento(null);
        assertThat(builder.buildNotificacionGuia(p, p.getUsuarioFinal()))
            .contains("https://hotclick.lat/mis-pedidos")
            .doesNotContain("/seguimiento/");
    }

    @Test
    @DisplayName("Escapa el número de guía")
    void escapaGuia() {
        Pedido p = pedido("<b>RR1</b>", null, "Ana");
        String html = builder.buildNotificacionGuia(p, p.getUsuarioFinal());
        assertThat(html).doesNotContain("<b>RR1</b>").contains("&lt;b&gt;RR1&lt;/b&gt;");
    }

    @Test
    @DisplayName("B17: «Paquete N de M» cuando el pago tiene varios paquetes; solo uno no lo dibuja")
    void paqueteNdeM() {
        com.hotclick.repository.PedidoRepository repo = mock(com.hotclick.repository.PedidoRepository.class);
        ReflectionTestUtils.setField(builder, "pedidoRepository", repo);
        Pedido p = pedido("RR123456789CR", null, "Andrea");
        p.setId(11L);
        p.setGrupoPago("GRP-1");
        Pedido otro = new Pedido();
        otro.setId(10L);
        when(repo.findByGrupoPagoOrderByIdAsc("GRP-1")).thenReturn(java.util.List.of(otro, p));

        assertThat(builder.buildNotificacionGuia(p, p.getUsuarioFinal()))
            .contains("Paquete 2 de 2.")
            .contains("Los otros paquetes de tu compra");

        when(repo.findByGrupoPagoOrderByIdAsc("GRP-1")).thenReturn(java.util.List.of(p));
        assertThat(builder.buildNotificacionGuia(p, p.getUsuarioFinal()))
            .doesNotContain("Paquete ")
            .doesNotContain("Los otros paquetes");
    }
}
