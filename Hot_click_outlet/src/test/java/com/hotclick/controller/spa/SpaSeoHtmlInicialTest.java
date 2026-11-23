package com.hotclick.controller.spa;

import com.hotclick.controller.SpaController;
import com.hotclick.model.Empresa;
import com.hotclick.model.Marca;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.service.contacto.ContactoTextoPublico;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("HTML inicial (sin JS) de fichas y tiendas: meta, JSON-LD y texto visible")
class SpaSeoHtmlInicialTest {

    private static final String INDEX = """
        <html><head>
        <!-- HC_SEO_BLOCK_START -->
        <title>HOTCLICK home</title>
        <link rel="canonical" href="https://hotclick.lat/" />
        <link rel="alternate" hreflang="es-CR" href="https://hotclick.lat/" />
        <!-- HC_SEO_BLOCK_END -->
        <!-- HC_HOME_LD_START -->
        <script type="application/ld+json">{"@type":"FAQPage"}</script>
        <!-- HC_HOME_LD_END -->
        </head><body>
        <!-- HC_SEO_BODY_START -->
        <noscript><main><h1>HOTCLICK home</h1></main></noscript>
        <!-- HC_SEO_BODY_END -->
        <div id="root"></div></body></html>
        """;

    private static final String XSS = "<script>alert(1)</script> \"comillas\" & más\nlínea";

    private SpaSeoSupport seo;
    private TestimonioRepository testimonios;

    @BeforeEach
    void setUp() {
        testimonios = mock(TestimonioRepository.class);
        ContactoTextoPublico contacto = mock(ContactoTextoPublico.class);
        when(contacto.texto(any(), any())).thenAnswer(i -> i.getArgument(1));
        seo = new SpaSeoSupport(testimonios, contacto);
        ReflectionTestUtils.setField(seo, "appUrl", "https://hotclick.lat");
    }

    private static Producto producto(String nombre, int precio, int stock) {
        Producto p = new Producto();
        p.setId(620L);
        p.setNombreProducto(nombre);
        p.setDescripcionCorta("Una descripción corta");
        p.setPrecioVenta(precio);
        p.setStockActual(stock);
        p.setStockReservado(0);
        return p;
    }

    private static Empresa empresa(boolean prueba) {
        Empresa e = new Empresa();
        e.setSlug("mi-tienda");
        e.setNombreEmpresa("Mi Tienda");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setEsPrueba(prueba);
        return e;
    }

    @Test
    void fichaTraeMetaProductOfferBreadcrumbYTextoVisible() {
        Marca marca = new Marca();
        marca.setNombreMarca("Acme");
        Producto p = producto("Audífonos Pro", 15900, 3);
        p.setMarca(marca);

        String html = seo.injectProductMeta(INDEX, p, empresa(false));

        assertThat(html).contains("<title>Audífonos Pro – Acme | HOTCLICK</title>")
            .contains("<link rel=\"canonical\" href=\"https://hotclick.lat/productos/620\" />")
            .contains("<meta property=\"og:url\" content=\"https://hotclick.lat/productos/620\" />")
            .contains("<meta property=\"og:type\" content=\"product\" />")
            .contains("hreflang=\"es-CR\" href=\"https://hotclick.lat/productos/620\"")
            .contains("hreflang=\"x-default\" href=\"https://hotclick.lat/productos/620\"")
            .contains("\"@type\":\"Product\"")
            .contains("\"price\":\"15900\"")
            .contains("\"priceCurrency\":\"CRC\"")
            .contains("\"availability\":\"https://schema.org/InStock\"")
            .contains("\"brand\":{\"@type\":\"Brand\",\"name\":\"Acme\"}")
            .contains("\"@type\":\"BreadcrumbList\"")
            .contains("<h1>Audífonos Pro</h1>")
            .contains("₡15.900")
            .contains("Una descripción corta")
            .doesNotContain("FAQPage")
            .doesNotContain("hreflang=\"es-CR\" href=\"https://hotclick.lat/\"")
            .doesNotContain("HOTCLICK home")
            .doesNotContain("aggregateRating");
    }

    @Test
    void sinStockEsOutOfStockYMarcaCaeAlNombreDeLaTienda() {
        String html = seo.injectProductMeta(INDEX, producto("Taza", 2000, 0), empresa(false));
        assertThat(html).contains("https://schema.org/OutOfStock")
            .contains("\"brand\":{\"@type\":\"Brand\",\"name\":\"Mi Tienda\"}");
    }

    @Test
    void ratingSoloConResenasReales() {
        when(testimonios.countAprobadosConCalificacion(anyLong())).thenReturn(4L);
        when(testimonios.avgCalificacion(anyLong())).thenReturn(4.5);
        String html = seo.injectProductMeta(INDEX, producto("Taza", 2000, 1), empresa(false));
        assertThat(html).contains("\"ratingValue\":\"4.5\"").contains("\"reviewCount\":\"4\"");
        assertThat(html.split("\"@type\":\"Product\"", -1)).hasSize(2); // un solo nodo Product
    }

    @Test
    void xssEnTituloDescripcionYMarcaSaleEscapado() {
        Producto p = producto(XSS, 1000, 1);
        p.setDescripcionCorta(XSS);
        p.setMarcaTexto(XSS);
        String html = seo.injectProductMeta(INDEX, p, empresa(false));

        assertThat(html).doesNotContain("<script>alert(1)</script>");
        assertThat(html).contains("&lt;script&gt;alert(1)&lt;/script&gt;");
        String marca = "data-hc-ssr=\"1\">";
        int ini = html.indexOf(marca) + marca.length();
        String json = html.substring(ini, html.indexOf("</script>", ini)).strip();
        assertThat(json).doesNotContain("<").doesNotContain(">")
            .contains("\\u003cscript\\u003e").contains("\\\"comillas\\\"").contains("\\u0026");
        assertThat(json.lines().count()).isEqualTo(1);
        assertThat(html).doesNotContain("content=\"<script>").contains("&quot;comillas&quot;");
    }

    @Test
    void separadoresU2028YU2029NoSalenCrudosEnElJsonLd() {
        String raw = "uno\u2028dos\u2029tres";
        Producto p = producto(raw, 1000, 1);
        p.setDescripcionCorta(raw);
        p.setMarcaTexto(raw);
        Empresa e = empresa(false);
        e.setTagline(raw);
        for (String html : new String[] {
            seo.injectProductMeta(INDEX, p, e),
            seo.injectTiendaMeta(INDEX, e, "/tienda/mi-tienda")}) {
            String marca = "application/ld+json\" data-hc-ssr=\"1\">";
            int ini = html.indexOf(marca);
            assertThat(ini).isGreaterThanOrEqualTo(0);
            while (ini >= 0) {
                int desde = ini + marca.length();
                String json = html.substring(desde, html.indexOf("</script>", desde));
                assertThat(json).doesNotContain("\u2028").doesNotContain("\u2029");
                ini = html.indexOf(marca, desde);
            }
            assertThat(html).contains("uno\\u2028dos\\u2029tres");
        }
    }

    @Test
    void productoDeTiendaDePruebaVaNoindexSinSchema() {
        String html = seo.injectProductMeta(INDEX, producto("Taza", 2000, 1), empresa(true));
        assertThat(html).contains("noindex").doesNotContain("\"@type\":\"Product\"").doesNotContain("\"Offer\"")
            .doesNotContain("hreflang").doesNotContain("Taza");
    }

    @Test
    void tiendaTraeOnlineStoreBreadcrumbYTexto() {
        Empresa e = empresa(false);
        e.setTagline(XSS);
        String html = seo.injectTiendaMeta(INDEX, e, "/tienda/mi-tienda");

        assertThat(html).contains("<link rel=\"canonical\" href=\"https://hotclick.lat/tienda/mi-tienda\" />")
            .contains("hreflang=\"x-default\" href=\"https://hotclick.lat/tienda/mi-tienda\"")
            .contains("\"@type\":\"OnlineStore\"")
            .contains("\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}")
            .contains("\"@type\":\"BreadcrumbList\"")
            .doesNotContain("PostalAddress").doesNotContain("LocalBusiness").doesNotContain("FAQPage")
            .contains("<h1>Mi Tienda</h1>")
            .doesNotContain("<script>alert(1)</script>")
            .contains("&lt;script&gt;alert(1)&lt;/script&gt;");
    }

    @Test
    void tiendaDePruebaVaNoindexSinSchemaNiTextoDelNegocio() {
        for (String ruta : new String[] {"/tienda/mi-tienda", "/tienda/mi-tienda/producto/5"}) {
            String html = seo.injectTiendaMeta(INDEX, empresa(true), ruta);
            assertThat(html).contains("<meta name=\"robots\" content=\"noindex, nofollow\" />")
                .doesNotContain("OnlineStore").doesNotContain("LocalBusiness").doesNotContain("Mi Tienda")
                .doesNotContain("FAQPage").doesNotContain("hreflang");
        }
    }

    @Test
    void paginasInyectadasNoHeredanFaqNiTextoDeLaHome() {
        String html = seo.injectLandingPlan(INDEX, "Plan PYME | HotClick", "desc", "/para-pymes");
        assertThat(html).doesNotContain("FAQPage").doesNotContain("HOTCLICK home")
            .contains("<h1>Plan PYME</h1>")
            .contains("\"@type\":\"BreadcrumbList\"")
            .contains("hreflang=\"es-CR\" href=\"https://hotclick.lat/para-pymes\"");
    }

    @Test
    void productoNoEncontradoSigueNoindex() {
        String html = seo.injectProductNotFoundMeta(INDEX, "999");
        assertThat(html).contains("<meta name=\"robots\" content=\"noindex, follow\" />")
            .contains("<link rel=\"canonical\" href=\"https://hotclick.lat/productos/999\" />")
            .doesNotContain("\"Product\"").doesNotContain("FAQPage");
    }

    @Test
    void controladorUsaElNegocioDeLaFichaParaMarcarPrueba() {
        ProductoRepository productos = mock(ProductoRepository.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        Empresa e = empresa(true);
        e.setId(7L);
        Producto p = producto("Taza", 2000, 1);
        p.setEstado(1);
        p.setEmpresa(e);
        when(productos.findById(620L)).thenReturn(Optional.of(p));
        when(productos.esPublicable(620L)).thenReturn(true);
        when(empresas.findById(7L)).thenReturn(Optional.of(e));
        SpaController c = new SpaController();
        ReflectionTestUtils.setField(c, "productoRepository", productos);
        ReflectionTestUtils.setField(c, "empresaRepository", empresas);
        ReflectionTestUtils.setField(c, "spaSeoSupport", seo);
        ReflectionTestUtils.setField(c, "indexHtmlContent", INDEX);

        ResponseEntity<String> r = c.productPage("620");
        assertThat(r.getBody()).contains("noindex").doesNotContain("\"Product\"");

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI("/tienda/mi-tienda");
        when(empresas.findBySlug("mi-tienda")).thenReturn(Optional.of(e));
        assertThat(c.tiendaPage("mi-tienda", req).getBody()).contains("noindex").doesNotContain("OnlineStore");
    }
}
