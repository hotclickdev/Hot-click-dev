package com.hotclick.controller.spa;

import com.hotclick.dto.seo.SeoPublicoDtos.ProductoSeo;
import com.hotclick.dto.seo.SeoPublicoDtos.ProvinciaSeo;
import com.hotclick.dto.seo.SeoPublicoDtos.SectorDetalle;
import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.service.contacto.ContactoTextoPublico;
import com.hotclick.utils.EmpresaNombre;
import com.hotclick.utils.FormatoColones;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Helpers de SEO de la SPA extraídos de SpaController sin cambiar comportamiento.
 */
@Component
public class SpaSeoSupport {

    private static final String SEO_START = "<!-- HC_SEO_BLOCK_START -->";
    private static final String SEO_END = "<!-- HC_SEO_BLOCK_END -->";
    /** Texto visible sin JS (envuelve el {@code <noscript>} del index). Cada ruta inyectada lo reemplaza. */
    private static final String BODY_START = "<!-- HC_SEO_BODY_START -->";
    private static final String BODY_END = "<!-- HC_SEO_BODY_END -->";
    /** JSON-LD solo de la home (Organization, WebSite, FAQPage): se quita de toda página inyectada. */
    private static final String HOME_LD_START = "<!-- HC_HOME_LD_START -->";
    private static final String HOME_LD_END = "<!-- HC_HOME_LD_END -->";
    private static final String ROBOTS_INDEX = "index, follow, max-snippet:-1, max-image-preview:large";

    private final TestimonioRepository testimonioRepository;
    private final ContactoTextoPublico contactoTexto;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl;

    public SpaSeoSupport(TestimonioRepository testimonioRepository, ContactoTextoPublico contactoTexto) {
        this.testimonioRepository = testimonioRepository;
        this.contactoTexto = contactoTexto;
    }

    public String injectProductMeta(String html, Producto p) {
        return injectProductMeta(html, p, null);
    }

    /**
     * Ficha de producto con Product+Offer y BreadcrumbList en el HTML inicial.
     * {@code empresa} es el negocio dueño (puede ser null si no se pudo cargar); si es de prueba la ficha va noindex y sin schema.
     */
    public String injectProductMeta(String html, Producto p, Empresa empresa) {
        String path = "/productos/" + p.getId();
        if (empresa != null && empresa.isEsPrueba()) {
            return injectNoindexPrueba(html, path);
        }
        String nombre = p.getTituloProducto() != null && !p.getTituloProducto().isBlank()
            ? p.getTituloProducto() : p.getNombreProducto();

        String metaTitle = p.getMetaTitle() != null && !p.getMetaTitle().isBlank()
            ? p.getMetaTitle() : buildProductTitle(nombre, p);

        String metaDesc = p.getMetaDescription() != null && !p.getMetaDescription().isBlank()
            ? p.getMetaDescription() : buildProductDescription(nombre, p);

        // Plan sin contacto directo: sin teléfonos, correos ni enlaces externos en las meta públicas.
        nombre = contactoTexto.texto(p.getEmpresaId(), nombre);
        metaTitle = contactoTexto.texto(p.getEmpresaId(), metaTitle);
        metaDesc = contactoTexto.texto(p.getEmpresaId(), metaDesc);

        String imagen = urlHttp(p.getImagenPrincipalUrl()) ? p.getImagenPrincipalUrl() : appUrl + "/og-image.png";
        String url = appUrl + path;

        String corta = p.getDescripcionCorta() != null && !p.getDescripcionCorta().isBlank()
            ? contactoTexto.texto(p.getEmpresaId(), p.getDescripcionCorta()) : null;
        String marca = nombreMarca(p, empresa);

        long ratingCount = Optional.ofNullable(testimonioRepository.countAprobadosConCalificacion(p.getId())).orElse(0L);
        Double ratingAvg = ratingCount > 0 ? testimonioRepository.avgCalificacion(p.getId()) : null;

        String json = "{\"@context\":\"https://schema.org\",\"@graph\":["
            + jsonProducto(p, nombre, corta, imagen, url, marca, ratingAvg, ratingCount) + ","
            + migasProducto(url, nombre) + "]}";

        StringBuilder seoBlock = new StringBuilder(SEO_START).append('\n')
            .append(metasPagina(metaTitle, metaDesc, ROBOTS_INDEX, url, "product", imagen, "HOTCLICK", nombre + " — HOTCLICK Costa Rica"))
            .append("\n    <script type=\"application/ld+json\" data-hc-ssr=\"1\">\n    ").append(json).append("\n    </script>\n    ")
            .append(SEO_END);

        String disponible = stockDisponible(p) > 0 ? "Disponible" : "Agotado";
        StringBuilder cuerpo = new StringBuilder("<h1>").append(xe(nombre)).append("</h1>");
        if (corta != null) cuerpo.append("<p>").append(xe(corta)).append("</p>");
        if (p.getPrecioVenta() != null && p.getPrecioVenta() > 0) {
            cuerpo.append("<p>Precio: ").append(xe(FormatoColones.colones(p.getPrecioVenta()))).append(" · ").append(disponible).append("</p>");
        }
        if (marca != null && !marca.isBlank()) cuerpo.append("<p>Marca: ").append(xe(marca)).append("</p>");
        cuerpo.append("<p>Envío a todo Costa Rica con HOTCLICK.</p>");
        return render(html, seoBlock.toString(), cuerpo.toString());
    }

    /** Página de negocio o producto de prueba pedida por URL: noindex, sin schema ni hreflang, sin datos del negocio. */
    public String injectNoindexPrueba(String html, String path) {
        return injectPagina(html, "HOTCLICK", "Página no disponible para buscadores.", path, "noindex, nofollow", null);
    }

    public String buildProductTitle(String nombre, Producto p) {
        String marca = p.getMarca() != null ? p.getMarca().getNombreMarca() : p.getMarcaTexto();
        return marca != null && !marca.isBlank()
            ? nombre + " – " + marca + " | HOTCLICK"
            : nombre + " | HOTCLICK Costa Rica";
    }

    public String buildProductDescription(String nombre, Producto p) {
        String base = p.getDescripcionCorta() != null && !p.getDescripcionCorta().isBlank()
            ? p.getDescripcionCorta()
            : nombre;
        if (base.length() > 130) base = base.substring(0, 127) + "...";
        String precio = FormatoColones.miles(p.getPrecioVenta());
        return base + " – ₡" + precio + " | Envío a todo Costa Rica.";
    }

    public String injectBlogMeta(String html, BlogEntrada e) {
        String titulo = e.getTitulo() != null ? e.getTitulo() : "";
        String title = titulo + " | Blog HOTCLICK";
        String desc = e.getResumen() != null && !e.getResumen().isBlank()
            ? e.getResumen()
            : titulo;
        if (desc.length() > 155) desc = desc.substring(0, 152) + "...";

        String imagen = urlHttp(e.getImagenUrl()) ? e.getImagenUrl() : appUrl + "/og-image.png";
        String url = appUrl + "/blog/" + (e.getSlug() != null ? e.getSlug() : e.getId());

        String seoBlock = SEO_START + "\n"
            + metasPagina(title, desc, "index, follow", url, "article", imagen, "HOTCLICK", titulo) + "\n    "
            + SEO_END;
        String cuerpo = "<h1>" + xe(titulo) + "</h1><p>" + xe(desc) + "</p>";
        return render(html, seoBlock, cuerpo);
    }

    public String injectTiendaMeta(String html, Empresa empresa, String requestPath) {
        if (empresa.isEsPrueba()) {
            return injectNoindexPrueba(html, "/tienda/" + empresa.getSlug());
        }
        String productoId = idProductoTienda(empresa.getSlug(), requestPath);
        if (productoId != null) {
            return injectPagina(html,
                "Producto | HOTCLICK",
                "Ficha del producto en HotClick.",
                "/productos/" + productoId,
                "index, follow",
                null);
        }
        if (esRutaPrivadaTienda(requestPath)) {
            return injectPagina(html, "Tienda | HOTCLICK", "Carrito de la tienda.", "/tienda/" + empresa.getSlug(), "noindex, follow", null);
        }
        return injectTiendaHome(html, empresa);
    }

    public String injectSector(String html, SectorDetalle sector) {
        String title = sector.nombre() + " en Costa Rica — comprá en línea | HotClick";
        String desc = recortar(sector.descripcion(), 155);
        String path = "/comprar/" + sector.slug();
        return injectPagina(html, title, desc, path, "index, follow", jsonSector(sector, desc, path));
    }

    public String injectProvincia(String html, ProvinciaSeo provincia) {
        String title = "Tiendas en " + provincia.nombre() + ", Costa Rica | HotClick";
        String desc = "Tiendas en línea de emprendedores, pymes y negocios en " + provincia.nombre()
            + ", Costa Rica. Comprá en HotClick con envío a todo el país.";
        String path = "/tiendas/" + provincia.slug();
        return injectPagina(html, title, desc, path, "index, follow", jsonProvincia(title, desc, provincia));
    }

    public String injectBuscarProducto(String html) {
        String title = "Buscar un producto en Costa Rica | HotClick";
        String desc = "Si no está en el catálogo, HotClick lo busca entre emprendedores, pymes y negocios. El servicio es gratis.";
        String json = servicioConFaq("Búsqueda de producto", desc, "/servicios/buscar-producto",
            "¿Cómo encuentra HotClick un producto que no está publicado?");
        return injectPagina(html, title, desc, "/servicios/buscar-producto", "index, follow", json);
    }

    public String injectDigitalizarInventario(String html) {
        String title = "Digitalizar inventario para vender en línea | HotClick";
        String desc = "HotClick digitaliza el inventario en tu local: códigos, SKU y etiquetas para productos sin código de barras.";
        String json = servicioConFaq("Digitalización de inventario", desc, "/servicios/digitalizar-inventario",
            "¿Qué es digitalizar el inventario?");
        return injectPagina(html, title, desc, "/servicios/digitalizar-inventario", "index, follow", json);
    }

    /** Landing de vendedor (/emprende, /para-pymes, /planes…): title, description, canonical y og:url de su ruta. */
    public String injectLandingPlan(String html, String title, String desc, String path) {
        String url = appUrl + path;
        String pagina = "{\"@type\":\"WebPage\",\"name\":\"" + escJson(titular(title))
            + "\",\"description\":\"" + escJson(desc) + "\",\"url\":\"" + escJson(url)
            + "\",\"inLanguage\":\"es-CR\",\"isPartOf\":{\"@type\":\"WebSite\",\"name\":\"HOTCLICK\",\"url\":\""
            + escJson(appUrl + "/") + "\"}}";
        String migas = "{\"@type\":\"BreadcrumbList\",\"itemListElement\":["
            + miga(1, "Inicio", appUrl + "/") + "," + miga(2, titular(title), url) + "]}";
        String json = "{\"@context\":\"https://schema.org\",\"@graph\":[" + pagina + "," + migas + "]}";
        return injectPagina(html, title, desc, path, "index, follow", json);
    }

    public String injectNoindex(String html, String title, String desc, String path) {
        return injectPagina(html, title, desc, path, "noindex, follow", null);
    }

    /** Meta noindex para PDP inexistente (acompaña HTTP 404). */
    public String injectProductNotFoundMeta(String html, String id) {
        String url = appUrl + "/productos/" + (id != null ? id : "");
        String title = "Producto no encontrado | HOTCLICK";
        String desc = "Este producto no está disponible en HotClick.";
        String seoBlock = SEO_START + "\n"
            + metasPagina(title, desc, "noindex, follow", url, "website", appUrl + "/og-image.png", "HOTCLICK", null) + "\n    "
            + SEO_END;
        return render(html, seoBlock, "<h1>" + xe(title) + "</h1><p>" + xe(desc) + "</p>");
    }

    /**
     * Escapa texto para un string JSON dentro de {@code <script type="application/ld+json">}:
     * comillas, barras, control, y &lt; &gt; &amp; como \\uXXXX para que un {@code </script>} del vendedor no cierre el bloque.
     */
    public static String escJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\r', '\n', '\t' -> sb.append(' ');
                case '<', '>', '&', '\u2028', '\u2029' -> sb.append(String.format("\\u%04x", (int) c));
                default -> {
                    if (c < 0x20) sb.append(' ');
                    else sb.append(c);
                }
            }
        }
        return sb.toString();
    }

    public static String xe(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    public static String xa(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("\r", " ").replace("\n", " ");
    }

    private String injectTiendaHome(String html, Empresa empresa) {
        String path = "/tienda/" + empresa.getSlug();
        if (empresa.isEsPrueba()) {
            return injectNoindexPrueba(html, path);
        }
        String nombre = EmpresaNombre.mostrar(empresa, empresa.getNombreEmpresa());
        String title = nombre + " — tienda en línea en Costa Rica";
        String desc = empresa.getTagline() != null && !empresa.getTagline().isBlank()
            ? empresa.getTagline()
            : "Comprá en " + nombre + ", tienda en línea en Costa Rica. Envío a todo el país por HotClick.";
        desc = contactoTexto.texto(empresa.getId(), desc);
        desc = recortar(desc, 155);
        String imagen = imagenOg(empresa);
        String url = appUrl + path;
        // Solo datos reales: nombre, url, imagen y país. Sin dirección ni contacto del vendedor.
        String tienda = "{\"@type\":\"OnlineStore\",\"name\":\"" + escJson(nombre)
            + "\",\"url\":\"" + escJson(url)
            + "\",\"image\":\"" + escJson(imagen)
            + "\",\"description\":\"" + escJson(desc)
            + "\",\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        String migas = "{\"@type\":\"BreadcrumbList\",\"itemListElement\":["
            + miga(1, "Inicio", appUrl + "/") + ","
            + miga(2, "Negocios", appUrl + "/emprendimientos") + ","
            + miga(3, nombre, url) + "]}";
        String json = "{\"@context\":\"https://schema.org\",\"@graph\":[" + tienda + "," + migas + "]}";
        String cuerpo = "<h1>" + xe(nombre) + "</h1><p>" + xe(desc) + "</p>"
            + "<p>Tienda en línea en Costa Rica, con envío a todo el país por HOTCLICK.</p>";
        return paginaCore(html, title, desc, path, "index, follow", json, imagen, nombre, cuerpo);
    }

    private String injectPagina(String html, String title, String description, String path, String robots, String jsonLd) {
        return injectPagina(html, title, description, path, robots, jsonLd, appUrl + "/og-image.png", "HOTCLICK");
    }

    private String injectPagina(String html, String title, String description, String path, String robots,
                                String jsonLd, String imagen, String siteName) {
        String cuerpo = "<h1>" + xe(titular(title)) + "</h1><p>" + xe(description) + "</p>"
            + "<p><a href=\"/\">Inicio</a> · <a href=\"/productos\">Productos</a></p>";
        return paginaCore(html, title, description, path, robots, jsonLd, imagen, siteName, cuerpo);
    }

    private String paginaCore(String html, String title, String description, String path, String robots,
                              String jsonLd, String imagen, String siteName, String cuerpo) {
        String url = path.startsWith("http") ? path : appUrl + path;
        String extra = jsonLd == null || jsonLd.isBlank()
            ? ""
            : "\n    <script type=\"application/ld+json\" data-hc-ssr=\"1\">\n    " + jsonLd + "\n    </script>";
        String seoBlock = SEO_START + "\n"
            + metasPagina(title, description, robots, url, "website", imagen, siteName, null)
            + extra + "\n    " + SEO_END;
        return render(html, seoBlock, cuerpo);
    }

    /** title, description, robots, canonical, hreflang (solo indexables), Open Graph y Twitter de UNA página. */
    private String metasPagina(String title, String description, String robots, String url, String ogType,
                               String imagen, String siteName, String imageAlt) {
        StringBuilder sb = new StringBuilder()
            .append("    <title>").append(xe(title)).append("</title>\n")
            .append("    <meta name=\"description\" content=\"").append(xa(description)).append("\" />\n")
            .append("    <meta name=\"robots\" content=\"").append(xa(robots)).append("\" />\n")
            .append("    <link rel=\"canonical\" href=\"").append(xa(url)).append("\" />\n");
        if (!robots.startsWith("noindex")) {
            // Un solo idioma real (es-CR): sin URLs /en ni /pt. x-default y es-CR apuntan a ESTA página.
            sb.append("    <link rel=\"alternate\" hreflang=\"es-CR\" href=\"").append(xa(url)).append("\" />\n")
              .append("    <link rel=\"alternate\" hreflang=\"x-default\" href=\"").append(xa(url)).append("\" />\n");
        }
        sb.append("    <meta property=\"og:title\" content=\"").append(xa(title)).append("\" />\n")
          .append("    <meta property=\"og:description\" content=\"").append(xa(description)).append("\" />\n")
          .append("    <meta property=\"og:type\" content=\"").append(xa(ogType)).append("\" />\n")
          .append("    <meta property=\"og:url\" content=\"").append(xa(url)).append("\" />\n")
          .append("    <meta property=\"og:image\" content=\"").append(xa(imagen)).append("\" />\n");
        if (imageAlt != null) {
            sb.append("    <meta property=\"og:image:alt\" content=\"").append(xa(imageAlt)).append("\" />\n");
        }
        sb.append("    <meta property=\"og:locale\" content=\"es_CR\" />\n")
          .append("    <meta property=\"og:site_name\" content=\"").append(xa(siteName)).append("\" />\n")
          .append("    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n")
          .append("    <meta name=\"twitter:site\" content=\"@hotclickcr\" />\n")
          .append("    <meta name=\"twitter:title\" content=\"").append(xa(title)).append("\" />\n")
          .append("    <meta name=\"twitter:description\" content=\"").append(xa(description)).append("\" />\n")
          .append("    <meta name=\"twitter:image\" content=\"").append(xa(imagen)).append("\" />");
        return sb.toString();
    }

    private String jsonProducto(Producto p, String nombre, String corta, String imagen, String url,
                                String marca, Double ratingAvg, long ratingCount) {
        StringBuilder sb = new StringBuilder("{\"@type\":\"Product\",\"name\":\"").append(escJson(nombre)).append('"');
        sb.append(",\"description\":\"").append(escJson(corta != null ? corta : nombre)).append('"');
        sb.append(",\"url\":\"").append(escJson(url)).append('"');
        sb.append(",\"image\":\"").append(escJson(imagen)).append('"');
        if (p.getSku() != null && !p.getSku().isBlank()) {
            sb.append(",\"sku\":\"").append(escJson(p.getSku())).append('"');
        }
        if (marca != null && !marca.isBlank()) {
            sb.append(",\"brand\":{\"@type\":\"Brand\",\"name\":\"").append(escJson(marca)).append("\"}");
        }
        if (p.getPrecioVenta() != null && p.getPrecioVenta() > 0) {
            String disp = stockDisponible(p) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
            sb.append(",\"offers\":{\"@type\":\"Offer\",\"url\":\"").append(escJson(url))
              .append("\",\"price\":\"").append(p.getPrecioVenta())
              .append("\",\"priceCurrency\":\"CRC\",\"availability\":\"").append(disp).append("\"}");
        }
        if (ratingAvg != null && ratingCount > 0) {
            double rounded = Math.round(ratingAvg * 10.0) / 10.0;
            sb.append(",\"aggregateRating\":{\"@type\":\"AggregateRating\",\"ratingValue\":\"").append(rounded)
              .append("\",\"reviewCount\":\"").append(ratingCount)
              .append("\",\"bestRating\":\"5\",\"worstRating\":\"1\"}");
        }
        return sb.append('}').toString();
    }

    private String migasProducto(String url, String nombre) {
        return migas(url, nombre);
    }

    /** Marca real del producto; si no hay, el nombre de la tienda. Nunca datos de contacto del vendedor. */
    private String nombreMarca(Producto p, Empresa empresa) {
        String marca = p.getMarca() != null ? p.getMarca().getNombreMarca() : p.getMarcaTexto();
        if (marca == null || marca.isBlank()) {
            marca = empresa != null ? EmpresaNombre.mostrar(empresa, empresa.getNombreEmpresa()) : null;
        }
        return marca == null ? null : contactoTexto.texto(p.getEmpresaId(), marca);
    }

    private static int stockDisponible(Producto p) {
        return p.getStockActual() == null ? 0 : p.getStockDisponible();
    }

    private static boolean urlHttp(String url) {
        return url != null && (url.startsWith("https://") || url.startsWith("http://"));
    }

    /** «Plan Emprendedor: … | HotClick» → quita el sufijo de marca para el h1. */
    private static String titular(String title) {
        if (title == null) return "";
        int i = title.lastIndexOf(" | ");
        return i > 0 ? title.substring(0, i) : title;
    }

    private String jsonSector(SectorDetalle sector, String desc, String path) {
        String url = appUrl + path;
        return "{\"@context\":\"https://schema.org\",\"@graph\":["
            + coleccion(sector.nombre(), desc, url) + ","
            + migas(url, sector.nombre()) + ","
            + listaProductos(sector) + "]}";
    }

    private String jsonProvincia(String title, String desc, ProvinciaSeo provincia) {
        String area = "{\"@type\":\"AdministrativeArea\",\"name\":\"" + escJson(provincia.nombre())
            + "\",\"containedInPlace\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        return "{\"@context\":\"https://schema.org\",\"@type\":\"CollectionPage\",\"name\":\""
            + escJson(title) + "\",\"description\":\"" + escJson(desc) + "\",\"areaServed\":" + area + "}";
    }

    private String servicioConFaq(String nombre, String desc, String path, String pregunta) {
        String servicio = "{\"@type\":\"Service\",\"name\":\"" + escJson(nombre)
            + "\",\"description\":\"" + escJson(desc)
            + "\",\"url\":\"" + escJson(appUrl + path)
            + "\",\"provider\":{\"@type\":\"Organization\",\"name\":\"HOTCLICK\",\"url\":\"" + escJson(appUrl + "/")
            + "\"},\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        String faq = "{\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\""
            + escJson(pregunta) + "\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"" + escJson(desc) + "\"}}]}";
        return "{\"@context\":\"https://schema.org\",\"@graph\":[" + servicio + "," + faq + "]}";
    }

    private static String coleccion(String nombre, String desc, String url) {
        return "{\"@type\":\"CollectionPage\",\"name\":\"" + escJson(nombre)
            + "\",\"description\":\"" + escJson(desc) + "\",\"url\":\"" + escJson(url) + "\"}";
    }

    private String migas(String url, String nombre) {
        return "{\"@type\":\"BreadcrumbList\",\"itemListElement\":["
            + miga(1, "Inicio", appUrl + "/") + ","
            + miga(2, "Productos", appUrl + "/productos") + ","
            + miga(3, nombre, url) + "]}";
    }

    private static String miga(int posicion, String nombre, String url) {
        return "{\"@type\":\"ListItem\",\"position\":" + posicion
            + ",\"name\":\"" + escJson(nombre) + "\",\"item\":\"" + escJson(url) + "\"}";
    }

    private String listaProductos(SectorDetalle sector) {
        StringBuilder items = new StringBuilder();
        int mostrados = 0;
        for (ProductoSeo producto : sector.productos()) {
            if (mostrados == 10) break;
            if (mostrados > 0) items.append(',');
            mostrados++;
            items.append("{\"@type\":\"ListItem\",\"position\":").append(mostrados)
                .append(",\"name\":\"").append(escJson(producto.nombre()))
                .append("\",\"url\":\"").append(escJson(appUrl + "/productos/" + producto.id())).append("\"}");
        }
        return "{\"@type\":\"ItemList\",\"name\":\"" + escJson(sector.nombre() + " en Costa Rica")
            + "\",\"numberOfItems\":" + mostrados + ",\"itemListElement\":[" + items + "]}";
    }

    private static String idProductoTienda(String slug, String path) {
        if (path == null || slug == null) return null;
        String marca = "/tienda/" + slug + "/producto/";
        int i = path.indexOf(marca);
        if (i < 0) return null;
        String resto = path.substring(i + marca.length()).replaceAll("/$", "");
        return resto.matches("\\d+") ? resto : null;
    }

    private static boolean esRutaPrivadaTienda(String path) {
        if (path == null) return false;
        return path.contains("/carrito") || path.contains("/checkout");
    }

    private static String recortar(String texto, int max) {
        if (texto == null) return "";
        if (texto.length() <= max) return texto;
        return texto.substring(0, max - 3) + "...";
    }

    private String imagenOg(Empresa empresa) {
        if (empresa.getOgImagenUrl() != null && !empresa.getOgImagenUrl().isBlank()) {
            return empresa.getOgImagenUrl();
        }
        if (empresa.getLogoUrl() != null && !empresa.getLogoUrl().isBlank()) {
            return empresa.getLogoUrl();
        }
        return appUrl + "/og-image.png";
    }

    /** Reemplaza el bloque meta, el texto visible sin JS y quita el JSON-LD exclusivo de la home. */
    private String render(String html, String seoBlock, String cuerpoHtml) {
        String out = replaceSeoBlock(html, seoBlock);
        out = quitarEntre(out, HOME_LD_START, HOME_LD_END);
        int start = out.indexOf(BODY_START);
        int end = out.indexOf(BODY_END);
        if (start == -1 || end == -1 || end < start) return out;
        return out.substring(0, start) + BODY_START + "\n    <noscript><main>" + cuerpoHtml + "</main></noscript>\n    "
            + BODY_END + out.substring(end + BODY_END.length());
    }

    private static String quitarEntre(String html, String ini, String fin) {
        int a = html.indexOf(ini);
        int b = html.indexOf(fin);
        if (a == -1 || b == -1 || b < a) return html;
        return html.substring(0, a) + html.substring(b + fin.length());
    }

    private String replaceSeoBlock(String html, String seoBlock) {
        int start = html.indexOf(SEO_START);
        int end = html.indexOf(SEO_END);
        if (start == -1 || end == -1) return html;
        return html.substring(0, start) + seoBlock + html.substring(end + SEO_END.length());
    }
}
