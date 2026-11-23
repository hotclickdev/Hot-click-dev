package com.hotclick.controller.spa;

import com.hotclick.controller.SpaController;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.service.contacto.ContactoTextoPublico;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** B1 (PR596): el SSR usa el mismo gate que /api/productos/{id} y no filtra datos de lo no publicable. */
@DisplayName("SSR de fichas y tiendas: lo no publicable da 404 + noindex sin datos")
class SpaSeoPublicabilidadTest {

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

    private static final String NOMBRE = "Audífonos Secretos Zeta";
    private static final String DESC = "Descripción confidencial Zeta";
    private static final String SKU = "SKU-ZETA-9";
    private static final String TIENDA = "Tienda Reservada Zeta";

    private ProductoRepository productos;
    private EmpresaRepository empresas;
    private SpaController controller;

    @BeforeEach
    void setUp() {
        productos = mock(ProductoRepository.class);
        empresas = mock(EmpresaRepository.class);
        ContactoTextoPublico contacto = mock(ContactoTextoPublico.class);
        when(contacto.texto(any(), any())).thenAnswer(i -> i.getArgument(1));
        SpaSeoSupport seo = new SpaSeoSupport(mock(TestimonioRepository.class), contacto);
        ReflectionTestUtils.setField(seo, "appUrl", "https://hotclick.lat");
        controller = new SpaController();
        ReflectionTestUtils.setField(controller, "productoRepository", productos);
        ReflectionTestUtils.setField(controller, "empresaRepository", empresas);
        ReflectionTestUtils.setField(controller, "spaSeoSupport", seo);
        ReflectionTestUtils.setField(controller, "indexHtmlContent", INDEX);
    }

    private Empresa empresa(String estado, boolean visible, String plan) {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setSlug("zeta");
        e.setNombreEmpresa(TIENDA);
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(visible);
        e.setEstadoPlan(plan);
        e.setEsPrueba(false);
        when(empresas.findById(7L)).thenReturn(Optional.of(e));
        when(empresas.findBySlug("zeta")).thenReturn(Optional.of(e));
        return e;
    }

    private Producto producto(Empresa e, boolean publicable) {
        Producto p = new Producto();
        p.setId(620L);
        p.setNombreProducto(NOMBRE);
        p.setDescripcionCorta(DESC);
        p.setSku(SKU);
        p.setPrecioVenta(77123);
        p.setStockActual(5);
        p.setStockReservado(0);
        p.setEstado(1);
        p.setEmpresa(e);
        when(productos.findById(620L)).thenReturn(Optional.of(p));
        // El gate real es la query esPublicable (la misma de la API); acá se fija su resultado por caso.
        when(productos.esPublicable(620L)).thenReturn(publicable);
        return p;
    }

    private void assert404SinDatos(ResponseEntity<String> r) {
        assertThat(r.getStatusCode().value()).isEqualTo(404);
        String b = r.getBody();
        assertThat(b).contains("noindex")
            .doesNotContain("name=\"robots\" content=\"index")
            .doesNotContain(NOMBRE).doesNotContain(DESC).doesNotContain(SKU).doesNotContain(TIENDA)
            .doesNotContain("77123").doesNotContain("77.123").doesNotContain("InStock").doesNotContain("OutOfStock")
            .doesNotContain("\"Product\"").doesNotContain("\"Offer\"").doesNotContain("hreflang")
            .doesNotContain("FAQPage").doesNotContain("HOTCLICK home");
    }

    @Test
    void fichaOcultaDa404SinDatos() {
        producto(empresa("ACTIVO", true, null), false); // visible_catalogo=false
        assert404SinDatos(controller.productPage("620"));
        verify(productos).esPublicable(620L);
    }

    @Test
    void fichaDeTiendaSuspendidaDa404SinDatos() {
        producto(empresa("SUSPENDIDO", true, null), false);
        assert404SinDatos(controller.productPage("620"));
    }

    @Test
    void fichaDeTiendaNoVisibleDa404SinDatos() {
        producto(empresa("ACTIVO", false, null), false);
        assert404SinDatos(controller.productPage("620"));
    }

    @Test
    void fichaDeTiendaSinMembresiaDa404SinDatos() {
        producto(empresa("ACTIVO", true, Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA), false);
        assert404SinDatos(controller.productPage("620"));
    }

    @Test
    void fichaPublicableSigueSiendo200IndexableConDatos() {
        producto(empresa("ACTIVO", true, null), true);
        ResponseEntity<String> r = controller.productPage("620");
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody()).contains(NOMBRE).contains("\"Product\"").contains("InStock")
            .contains("hreflang=\"es-CR\" href=\"https://hotclick.lat/productos/620\"")
            .doesNotContain("noindex");
    }

    @Test
    void tiendaNoPublicableDa404NoindexSinPortadaNiDatos() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI("/tienda/zeta");
        Object[][] casos = {{"SUSPENDIDO", true, null}, {"ACTIVO", false, null},
            {"ACTIVO", true, Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA}};
        for (Object[] c : casos) {
            empresa((String) c[0], (Boolean) c[1], (String) c[2]);
            assert404SinDatos(controller.tiendaPage("zeta", req));
        }
    }

    @Test
    void tiendaInexistenteDa404Noindex() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI("/tienda/no-existe/producto/5");
        when(empresas.findBySlug("no-existe")).thenReturn(Optional.empty());
        assert404SinDatos(controller.tiendaPage("no-existe", req));
    }

    @Test
    void tiendaPublicaSigueSiendo200IndexableConDatos() {
        empresa("ACTIVO", true, null);
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI("/tienda/zeta");
        ResponseEntity<String> r = controller.tiendaPage("zeta", req);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody()).contains(TIENDA).contains("OnlineStore").doesNotContain("noindex");
    }
}
