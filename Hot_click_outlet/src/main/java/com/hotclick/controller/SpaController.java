package com.hotclick.controller;

import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Empresa;
import com.hotclick.controller.spa.SpaSeoSupport;
import com.hotclick.repository.BlogEntradaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
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
                .orElseGet(this::serveSpa);
        } catch (NumberFormatException e) {
            return serveSpa();
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
    public ResponseEntity<String> tiendaPage(@PathVariable String slug) {
        return empresaRepository.findBySlug(slug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()) && Boolean.TRUE.equals(e.getVisibilidadPublica()))
            .<ResponseEntity<String>>map(e -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .body(spaSeoSupport.injectTiendaMeta(indexHtmlContent, e)))
            .orElseGet(this::serveSpa);
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
        "/servicios",
        "/blog",
        "/emprendimientos",
        "/seleccionar-negocio",
        "/admin/compras",
        "/admin/compras/nueva",
        "/admin/proveedores",
        "/recuperar-carrito/{id}",
        "/admin",
        "/admin/{*path}",
        "/checkout/qr/{token}",
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
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
            .body(indexHtmlContent);
    }
}
