package com.hotclick.controller;

import com.hotclick.model.BlogEntrada;
import com.hotclick.controller.spa.SpaSeoSupport;
import com.hotclick.repository.BlogEntradaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.seo.SeoPublicoService;
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
                    .body(spaSeoSupport.injectProductMeta(indexHtmlContent, p)))
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
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()) && Boolean.TRUE.equals(e.getVisibilidadPublica()))
            .<ResponseEntity<String>>map(e -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
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

    @GetMapping(value = {
        "/",
        "/productos",
        "/descubri",
        "/carrito",
        "/login",
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
        "/nosotros",
        "/contacto",
        "/informacion",
        "/privacidad",
        "/terminos",
        "/cookies",
        "/envios",
        "/devoluciones",
        "/acuerdo-vendedores",
        "/servicios",
        "/blog",
        "/emprende",
        "/para-emprendedores",
        "/para-pymes",
        "/negocio-plus-plan",
        "/emprendimientos",
        "/404",
        "/seleccionar-negocio",
        "/admin/compras",
        "/admin/compras/nueva",
        "/admin/proveedores",
        "/recuperar-carrito/{id}",
        "/encargo/{token}",
        "/cotizacion/{token}",
        "/admin",
        "/admin/{*path}",
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

    private ResponseEntity<String> serveSpa() {
        return html(indexHtmlContent);
    }

    private ResponseEntity<String> html(String body) {
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
            .body(body);
    }

    private ResponseEntity<String> htmlNoIndex(String title, String desc, String path) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
            .body(spaSeoSupport.injectNoindex(indexHtmlContent, title, desc, path));
    }

    /** Soft-404 de producto: HTTP 404 + SPA con noindex para que el cliente muestre UI. */
    private ResponseEntity<String> serveNotFound(String id) {
        return ResponseEntity.status(404)
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
            .body(spaSeoSupport.injectProductNotFoundMeta(indexHtmlContent, id));
    }
}
