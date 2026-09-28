package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

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
    @DisplayName("Escapa el número de guía")
    void escapaGuia() {
        Pedido p = pedido("<b>RR1</b>", null, "Ana");
        String html = builder.buildNotificacionGuia(p, p.getUsuarioFinal());
        assertThat(html).doesNotContain("<b>RR1</b>").contains("&lt;b&gt;RR1&lt;/b&gt;");
    }
}
