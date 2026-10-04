package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("EmailLayoutHelper — esqueleto de correos (Figma 08 · QR y correos)")
class EmailLayoutHelperTest {

    private final EmailLayoutHelper layout = new EmailLayoutHelper();

    @Test
    @DisplayName("esc() neutraliza HTML y comillas para evitar inyección en el correo")
    void esc_neutralizaInyeccion() {
        String malicioso = "<script>alert('x')</script> & \"cita\"";
        String escapado = layout.esc(malicioso);

        assertThat(escapado)
            .doesNotContain("<script>")
            .contains("&lt;script&gt;")
            .contains("&amp;")
            .contains("&quot;cita&quot;")
            .contains("&#39;");
    }

    @Test
    @DisplayName("esc() de null no revienta")
    void esc_null() {
        assertThat(layout.esc(null)).isEmpty();
    }

    @Test
    @DisplayName("El correo completo es una única tabla — sin flex ni <div> en el esqueleto")
    void estructuraDeTablas() {
        String html = layout.abrirHtml() + layout.header("Título", "Sub") + layout.abrirCuerpo()
            + layout.parrafo("cuerpo") + layout.footer("¿Dudas?");

        assertThat(html)
            .startsWith("<!DOCTYPE html>")
            .contains("<table")
            .contains("HotClick")
            .contains("8666-7888")
            .endsWith("</html>");
        assertThat(html).doesNotContain("display:flex");
    }

    @Test
    @DisplayName("cta() escapa la URL del botón")
    void cta_escapaUrl() {
        String html = layout.cta("https://hotclick.lat/x?a=1&b=2", "Ir");
        assertThat(html).contains("a=1&amp;b=2").contains(">Ir<");
    }

    @Test
    @DisplayName("filaProducto() escapa nombre y detalle provistos por el usuario")
    void filaProducto_escapaDatos() {
        String fila = layout.filaProducto(null, layout.esc("<b>Producto</b>"), layout.esc("Tienda \"mala\""), "₡1.000");
        assertThat(fila).contains("&lt;b&gt;Producto&lt;/b&gt;").contains("&quot;mala&quot;");
    }

    @Test
    @DisplayName("monto() formatea colones sin decimales")
    void monto_formatoColones() {
        // El separador de miles de es-CR lo decide el JVM (espacio duro o punto según el entorno);
        // por eso comparamos contra el propio formateador en vez de un literal.
        assertThat(layout.monto(95900)).isEqualTo("₡95.900");
        assertThat(layout.monto(null)).isEqualTo("₡0");
    }

    @Test
    @DisplayName("urlRastreo() usa la URL del pedido o arma la de Correos con la guía")
    void urlRastreo_pedidoOCorreos() {
        Pedido propio = new Pedido();
        propio.setNumeroGuia("HX-998");
        propio.setUrlTracking("https://hotclick.lat/rastreo/HX-998");
        Pedido correos = new Pedido();
        correos.setNumeroGuia("CR123456789");

        assertThat(layout.urlRastreo(propio)).isEqualTo("https://hotclick.lat/rastreo/HX-998");
        assertThat(layout.urlRastreo(correos)).isEqualTo("https://rastreo.correos.go.cr/?codigo=CR123456789");
        assertThat(layout.esRastreoCorreos(propio)).isFalse();
        assertThat(layout.esRastreoCorreos(correos)).isTrue();
    }
}
