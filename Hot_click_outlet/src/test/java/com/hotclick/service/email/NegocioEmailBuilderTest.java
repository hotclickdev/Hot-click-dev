package com.hotclick.service.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NegocioEmailBuilder — cupón de bienvenida (Figma: Correo · Cupón de bienvenida)")
class NegocioEmailBuilderTest {

    private final NegocioEmailBuilder builder = new NegocioEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    @Test
    @DisplayName("Muestra el código de cupón")
    void muestraCodigo() {
        String html = builder.buildCuponBienvenida("HOLA13");
        assertThat(html).contains("HOLA13").contains("13%");
    }

    @Test
    @DisplayName("Escapa el código de cupón por si llega con caracteres de HTML")
    void escapaCodigo() {
        String html = builder.buildCuponBienvenida("<script>1</script>");
        assertThat(html).doesNotContain("<script>1</script>").contains("&lt;script&gt;");
    }

    @Test
    @DisplayName("Sigue la estructura de Figma y no promete un vencimiento que el cupón no tiene")
    void estructuraDeFigma() {
        String html = builder.buildCuponBienvenida("HOLA13");
        assertThat(html)
            .contains("Tu 13% para la primera compra")
            .contains("Tu código")
            .contains("Usar mi cupón")
            .contains("/email/icono-regalo.png")
            .doesNotContain("30 días");
        assertThat(builder.asuntoCuponBienvenida()).isEqualTo("Tu 13% de descuento para la primera compra");
    }

    @Test
    @DisplayName("Alta de emprendimiento (admin): «3 meses gratis» derivado de la config, sin «cupo gratis»")
    void altaEmprendedorAdminDiceTresMesesGratis() {
        String periodo = new com.hotclick.service.suscripcion.TrialEmprendedorConfig(70, 90).periodoGratis();
        String conCupo = builder.buildAltaEmprendedorAdmin("Café Luz", "luz@correo.com", true,
            com.hotclick.dto.CupoEmprendedorEstado.of(3, 70, periodo));
        String ultimo = builder.buildAltaEmprendedorAdmin("Café Luz", "luz@correo.com", true,
            com.hotclick.dto.CupoEmprendedorEstado.of(70, 70, periodo));
        String sinCupo = builder.buildAltaEmprendedorAdmin("Café Luz", "luz@correo.com", false,
            com.hotclick.dto.CupoEmprendedorEstado.of(70, 70, periodo));

        assertThat(conCupo).contains("Entró con 3 meses gratis.");
        assertThat(ultimo).contains("último cupo de 3 meses gratis");
        assertThat(sinCupo).contains("Sin cupo de 3 meses gratis");
        assertThat(conCupo + ultimo + sinCupo).doesNotContain("cupo gratis");
    }

    private NegocioEmailBuilder conAppUrl(String appUrl) {
        EmailLayoutHelper l = new EmailLayoutHelper();
        if (appUrl != null) ReflectionTestUtils.setField(l, "appUrl", appUrl);
        NegocioEmailBuilder b = new NegocioEmailBuilder();
        ReflectionTestUtils.setField(b, "layout", l);
        return b;
    }

    @Test
    @DisplayName("QA W2-1: negocio pendiente => «en revisión», sin «tienda está lista» ni «Ya podés entrar»")
    void bienvenidaPendienteDiceEnRevision() {
        String html = builder.buildBienvenidaEmprendedor("Ana", "Café Luz", true);
        assertThat(html).contains("Recibimos tu negocio").contains("en revisión").contains("te avisaremos")
            .doesNotContain("Tu tienda está lista").doesNotContain("Ya podés entrar");
        assertThat(builder.asuntoBienvenidaEmprendedor("Café Luz", true))
            .contains("Recibimos tu negocio").doesNotContain("lista");
    }

    @Test
    @DisplayName("QA W2-1: negocio activo => mantiene el texto de tienda lista")
    void bienvenidaActivaDiceLista() {
        String html = builder.buildBienvenidaEmprendedor("Ana", "Café Luz", false);
        assertThat(html).contains("Tu tienda está lista").contains("Ya podés entrar").doesNotContain("en revisión");
        assertThat(builder.asuntoBienvenidaEmprendedor("Café Luz", false)).contains("Tu tienda está lista");
    }

    private java.util.List<String> todosLosCorreosConEnlace(NegocioEmailBuilder b) {
        return java.util.List.of(
            b.buildBienvenidaEmprendedor("Ana", "X", true),
            b.buildBienvenidaEmprendedor("Ana", "X", false),
            b.buildAprobacionNegocio("Ana", "X"),
            b.buildModeracionAprobada("Ana", "Producto", "X"),
            b.buildModeracionRechazada("Ana", "Producto", "X", "m"),
            b.buildProductoModerado("Ana", "X", true, "n"),
            b.buildCambioCobroPendiente("Ana", "IBAN", "****1"),
            b.buildInvitacionMiembro("a@b.com", "Ana", "EDITOR", "X", false),
            b.buildCuponBienvenida("C1"),
            b.buildResenaResultado("Ana", true, "X"));
    }

    @Test
    @DisplayName("QA W2-2: los enlaces usan app.url (QA/staging) y no apuntan a producción")
    void enlacesUsanAppUrlConfigurada() {
        for (String html : todosLosCorreosConEnlace(conAppUrl("https://qa.example.test/"))) {
            assertThat(html).contains("href=\"https://qa.example.test/").doesNotContain("href=\"https://hotclick.lat/");
        }
        assertThat(conAppUrl("https://qa.example.test").buildAprobacionNegocio("Ana", "X"))
            .contains("href=\"https://qa.example.test/admin\"");
    }

    @Test
    @DisplayName("QA W2-2: sin app.url configurada (o en blanco) los enlaces siguen en https://hotclick.lat")
    void enlacesPorDefectoHotclickLat() {
        for (String appUrl : new String[] {null, " "}) {
            NegocioEmailBuilder b = conAppUrl(appUrl);
            assertThat(b.buildBienvenidaEmprendedor("Ana", "X", true)).contains("href=\"https://hotclick.lat/admin\"");
            assertThat(b.buildCuponBienvenida("C1")).contains("href=\"https://hotclick.lat/productos\"");
            assertThat(b.buildInvitacionMiembro("a@b.com", "Ana", "EDITOR", "X", false)).contains("href=\"https://hotclick.lat/login\"");
        }
    }
}
