package com.hotclick.controller;

import com.hotclick.catalogo.CatalogoPublicoGate;
import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.controller.spa.SpaSeoSupport;
import com.hotclick.repository.BlogEntradaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.seo.SeoPublicoService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Optional;
import java.nio.charset.StandardCharsets;

/**
 * Forwards SPA routes to index.html so React Router handles client-side navigation.
 * For /productos/{id}, injects product-specific meta tags into the HTML before serving,
 * so crawlers that don't execute JS still see unique title/description per product.
 */
@Controller
public class SpaController {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private BlogEntradaRepository blogEntradaRepository;

    @Autowired
    private EmpresaRepository empresaRepository;

    @Autowired
    private SpaSeoSupport spaSeoSupport;

    @Autowired
    private SeoPublicoService seoPublicoService;

    @Autowired
    private PreciosPlanesConfig preciosPlanes;

    @Autowired
    private TrialEmprendedorConfig trialEmprendedor;

    @Value("classpath:/static/index.html")
    private Resource indexHtmlResource;

    private volatile String indexHtmlContent;

    @PostConstruct
    public void loadIndex() throws IOException {
        indexHtmlContent = new String(indexHtmlResource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    /** Product detail — injects product-specific meta tags for crawlers. */
    @GetMapping(value = "/productos/{id}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> productPage(@PathVariable String id) {
        try {
            long productId = Long.parseLong(id);
            return productoRepository.findById(productId)
                .filter(p -> p.getEstado() != null && p.getEstado() == 1)
                .map(p -> ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
                    .body(spaSeoSupport.injectProductMeta(indexHtmlContent, p, empresaDe(p))))
                .orElseGet(() -> serveNotFound(id));
        } catch (NumberFormatException e) {
            return serveNotFound(id);
        }
    }

    /** Blog post detail — injects article-specific meta tags for crawlers. */
    @GetMapping(value = "/blog/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> blogPostPage(@PathVariable String slug) {
        var opt = blogEntradaRepository.findBySlug(slug);
        if (opt.isEmpty()) return serveSpa();
        BlogEntrada e = opt.get();
        if (!Boolean.TRUE.equals(e.getPublicado()) || e.getEstado() == null || e.getEstado() != 1) {
            return serveSpa();
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
            .body(spaSeoSupport.injectBlogMeta(indexHtmlContent, e));
    }

    /**
     * Tienda pública de un emprendedor: /tienda/{slug} y todas sus sub-rutas.
     * Inyecta meta tags con el branding del negocio para crawlers y redes sociales.
     * Si el slug no existe o la empresa no es pública devuelve la SPA sin meta tags especiales.
     */
    @GetMapping(value = {"/tienda/{slug}", "/tienda/{slug}/**"},
                produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> tiendaPage(@PathVariable String slug, HttpServletRequest request) {
        return empresaRepository.findBySlug(slug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa())
                && Boolean.TRUE.equals(e.getVisibilidadPublica())
                && CatalogoPublicoGate.membresiaConfirmada(e.getEstadoPlan()))
            .<ResponseEntity<String>>map(e -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
                .body(spaSeoSupport.injectTiendaMeta(indexHtmlContent, e, request.getRequestURI())))
            .orElseGet(this::serveSpa);
    }

    @GetMapping(value = "/comprar/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> sectorPage(@PathVariable String slug) {
        return seoPublicoService.sector(slug)
            .map(sector -> html(spaSeoSupport.injectSector(indexHtmlContent, sector)))
            .orElseGet(() -> htmlNoIndex("Sector no encontrado | HOTCLICK",
                "Este sector no está publicado en HotClick.", "/comprar/" + slug));
    }

    @GetMapping(value = "/tiendas/{provincia}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> provinciaPage(@PathVariable String provincia) {
        return seoPublicoService.provincia(provincia)
            .map(p -> html(spaSeoSupport.injectProvincia(indexHtmlContent, p)))
            .orElseGet(() -> htmlNoIndex("Provincia no encontrada | HOTCLICK",
                "No hay tiendas publicadas en esta provincia.", "/tiendas/" + provincia));
    }

    @GetMapping(value = "/servicios/buscar-producto", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> buscarProductoPage() {
        return html(spaSeoSupport.injectBuscarProducto(indexHtmlContent));
    }

    @GetMapping(value = "/servicios/digitalizar-inventario", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> digitalizarInventarioPage() {
        return html(spaSeoSupport.injectDigitalizarInventario(indexHtmlContent));
    }

    // ── Landings de planes: title, description y canonical propios en el HTML inicial ─────────────────────────────
    // Los montos salen de la config del backend (PreciosPlanesConfig, TrialEmprendedorConfig), no del código.

    @GetMapping(value = "/emprende", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> emprendePage() {
        return landing("Plan Emprendedor: publicá y cobrá en HotClick | HotClick", descEmprende(), "/emprende");
    }

    /** Alias viejo de /emprende: 301 para que haya una sola URL indexable. */
    @GetMapping(value = {"/para-emprendedores", "/para-emprendedores/"})
    public ResponseEntity<Void> paraEmprendedoresAlias(HttpServletRequest request) {
        String query = request.getQueryString();
        return ResponseEntity.status(org.springframework.http.HttpStatus.MOVED_PERMANENTLY)
            .header("Location", "/emprende" + (query == null || query.isBlank() ? "" : "?" + query))
            .build();
    }

    @GetMapping(value = "/para-pymes", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> pymePage() {
        return landing("PYME: operá tu negocio en un solo panel | HotClick",
            "Plan PYME: " + mensualidad("PYME") + " + 7,5% por venta, sin mínimo. Equipo, inventario y caja en un solo panel. "
                + NOTA_MONEDA, "/para-pymes");
    }

    @GetMapping(value = "/negocio-plus-plan", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> negocioPlusPage() {
        return landing("Negocio Plus: todas tus sucursales en un panel | HotClick",
            "Plan Negocio Plus: " + mensualidad("NEGOCIO_PLUS") + " + 6% por venta, sin mínimo. Pedidos por local, equipo sin tope y CRM. "
                + NOTA_MONEDA, "/negocio-plus-plan");
    }

    @GetMapping(value = "/planes", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> planesPage() {
        return landing("Planes para vender en HotClick | HotClick",
            "Compará Emprendedor (" + mensualidad("EMPRENDEDOR") + " + 9%), PYME (" + mensualidad("PYME") + " + 7,5%) y Negocio Plus ("
                + mensualidad("NEGOCIO_PLUS") + " + 6%) por venta, sin mínimo. " + NOTA_MONEDA, "/planes");
    }

    @GetMapping(value = {
        "/",
        "/productos",
        "/descubri",
        "/categorias",
        "/buscar/foto",
        "/carrito",
        "/login",
        "/logout",
        "/recuperar-contrasena",
        "/equipo/invitacion",
        "/equipo/invitacion/*", // enlaces viejos con el token en el path: la SPA lo descarta (no lo usa)
        "/registrar-negocio",
        "/sso-callback",
        "/sso-complete",
        "/mode-select",
        "/registro",
        "/registro-empresa",
        "/perfil",
        "/checkout",
        "/mis-pedidos",
        "/wishlist",
        "/pago/exito",
        "/pago/cancelado",
        "/ayuda",
        "/registro-empresa/activar-plan",
        "/nosotros",
        "/contacto",
        "/informacion",
        "/privacidad",
        "/terminos",
        "/cookies",
        "/envios",
        "/devoluciones",
        "/acuerdo-vendedores",
        "/sin-conexion",
        "/servicios",
        "/blog",
        "/vender",
        "/emprendimientos",
        "/emprendimientos/{slug}",
        "/negocios",
        "/404",
        "/seleccionar-negocio",
        "/admin/compras",
        "/admin/compras/nueva",
        "/admin/proveedores",
        "/recuperar-carrito/{id}",
        "/encargo/{token}",
        "/r/{token}", // QR de retiro de pedidos de Telegram (página mínima, sin datos personales)
        "/cotizacion/{token}",
        "/seguimiento/{token}",
        "/admin",
        "/admin/{*path}",
        "/plataforma",
        "/plataforma/{*path}",
        "/visitante",
        "/visitante/{*path}",
        "/emprendedor",
        "/emprendedor/{*path}",
        "/pyme",
        "/pyme/{*path}",
        "/negocio-plus",
        "/negocio-plus/{*path}",
        "/prototipo",
        "/prototipo/{*path}",
        "/checkout/qr/{token}",
        "/pos/pago",
        "/pos/pago/{*path}",
        "/admin/gift-cards",
        "/admin/branding",
        "/admin/plugins",
        "/admin/inventario",
        "/admin/copilot",
        "/admin/forecast",
        "/admin/executive",
        "/admin/multipais"
    })
    public String spa() {
        return "forward:/index.html";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static final String NOTA_MONEDA = "Productos en colones; la mensualidad se cobra en dólares.";

    private ResponseEntity<String> landing(String title, String desc, String path) {
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
            .body(spaSeoSupport.injectLandingPlan(indexHtmlContent, title, desc, path));
    }

    /** «US$24/mes» si hay precio publicable en la config; si no, «mensualidad en dólares» (sin inventar monto). */
    private String mensualidad(String plan) {
        Optional<BigDecimal> usd = preciosPlanes == null ? Optional.empty() : preciosPlanes.precioPublicoUsd(plan);
        return usd.map(v -> "US$" + v.stripTrailingZeros().toPlainString() + "/mes").orElse("mensualidad en dólares");
    }

    private String descEmprende() {
        String base = "Plan Emprendedor: ";
        String despues = mensualidad("EMPRENDEDOR") + " + 9% por venta, sin mínimo. ";
        if (trialEmprendedor == null || trialEmprendedor.cupo() <= 0) {
            return base + despues + NOTA_MONEDA;
        }
        return base + trialEmprendedor.periodoGratis() + " sin mensualidad para los primeros " + trialEmprendedor.cupo()
            + " negocios; después " + despues + NOTA_MONEDA;
    }

    /** Negocio dueño del producto (la relación del producto es lazy y no se puede leer fuera de sesión). */
    private Empresa empresaDe(Producto p) {
        Long id = p.getEmpresaId();
        return id == null ? null : empresaRepository.findById(id).orElse(null);
    }

    private ResponseEntity<String> serveSpa() {
        return html(indexHtmlContent);
    }

    private ResponseEntity<String> html(String body) {
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
            .body(body);
    }

    private ResponseEntity<String> htmlNoIndex(String title, String desc, String path) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
            .body(spaSeoSupport.injectNoindex(indexHtmlContent, title, desc, path));
    }

    /** Soft-404 de producto: HTTP 404 + SPA con noindex para que el cliente muestre UI. */
    private ResponseEntity<String> serveNotFound(String id) {
        return ResponseEntity.status(404)
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .header("Content-Language", "es-CR")
            .body(spaSeoSupport.injectProductNotFoundMeta(indexHtmlContent, id));
    }
}
