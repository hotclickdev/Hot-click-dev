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
    private static final String SITIO = "HOTCLICK";
    private static final String ROBOTS_INDEX_SIMPLE = "index, follow";
    private static final String RUTA_PRODUCTOS = "/productos/";
    private static final String RUTA_TIENDA = "/tienda/";
    private static final String RUTA_OG_IMAGE = "/og-image.png";
    private static final String MIGA_INICIO = "Inicio";
    private static final String JSON_GRAPH_INI = "{\"@context\":\"https://schema.org\",\"@graph\":[";
    private static final String JSON_MIGAS_INI = "{\"@type\":\"BreadcrumbList\",\"itemListElement\":[";
    private static final String JSON_SEP_URL = "\",\"url\":\"";
    private static final String JSON_SEP_DESC = "\",\"description\":\"";
    private static final String H1_P = "</h1><p>";
    private static final String META_CIERRE = "\" />\n";
    private static final String SALTO_INDENT = "\n    ";

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
        String path = RUTA_PRODUCTOS + p.getId();
        if (empresa != null && empresa.isEsPrueba()) {
            return injectNoindexPrueba(html, path);
        }
        String nombre = nombreProducto(p);
        Long empresaId = p.getEmpresaId();

        // Plan sin contacto directo: sin teléfonos, correos ni enlaces externos en las meta públicas.
        String metaTitle = contactoTexto.texto(empresaId, tituloMeta(p, nombre));
        String metaDesc = contactoTexto.texto(empresaId, descripcionMeta(p, nombre));
        nombre = contactoTexto.texto(empresaId, nombre);

        String imagen = urlHttp(p.getImagenPrincipalUrl()) ? p.getImagenPrincipalUrl() : appUrl + RUTA_OG_IMAGE;
        String url = appUrl + path;
        String corta = p.getDescripcionCorta() != null && !p.getDescripcionCorta().isBlank()
            ? contactoTexto.texto(empresaId, p.getDescripcionCorta()) : null;
        String marca = nombreMarca(p, empresa);

        String json = jsonFichaProducto(p, nombre, corta, imagen, url, marca);
        StringBuilder seoBlock = new StringBuilder(SEO_START).append('\n')
            .append(metasPagina(metaTitle, metaDesc, ROBOTS_INDEX, url, "product", imagen, SITIO, nombre + " — HOTCLICK Costa Rica"))
            .append("\n    <script type=\"application/ld+json\" data-hc-ssr=\"1\">\n    ").append(json).append("\n    </script>\n    ")
            .append(SEO_END);
        return render(html, seoBlock.toString(), cuerpoProducto(p, nombre, corta, marca));
    }

    private static String nombreProducto(Producto p) {
        return p.getTituloProducto() != null && !p.getTituloProducto().isBlank()
            ? p.getTituloProducto() : p.getNombreProducto();
    }

    private String tituloMeta(Producto p, String nombre) {
        return p.getMetaTitle() != null && !p.getMetaTitle().isBlank() ? p.getMetaTitle() : buildProductTitle(nombre, p);
    }

    private String descripcionMeta(Producto p, String nombre) {
        return p.getMetaDescription() != null && !p.getMetaDescription().isBlank()
            ? p.getMetaDescription() : buildProductDescription(nombre, p);
    }

    private String jsonFichaProducto(Producto p, String nombre, String corta, String imagen, String url, String marca) {
        long ratingCount = Optional.ofNullable(testimonioRepository.countAprobadosConCalificacion(p.getId())).orElse(0L);
        Double ratingAvg = ratingCount > 0 ? testimonioRepository.avgCalificacion(p.getId()) : null;
        return JSON_GRAPH_INI
            + jsonProducto(p, nombre, corta, imagen, url, marca, ratingAvg, ratingCount) + ","
            + migasProducto(url, nombre) + "]}";
    }

    private static String cuerpoProducto(Producto p, String nombre, String corta, String marca) {
        StringBuilder cuerpo = new StringBuilder("<h1>").append(xe(nombre)).append("</h1>");
        if (corta != null) cuerpo.append("<p>").append(xe(corta)).append("</p>");
        if (p.getPrecioVenta() != null && p.getPrecioVenta() > 0) {
            String disponible = stockDisponible(p) > 0 ? "Disponible" : "Agotado";
            cuerpo.append("<p>Precio: ").append(xe(FormatoColones.colones(p.getPrecioVenta()))).append(" · ").append(disponible).append("</p>");
        }
        if (marca != null && !marca.isBlank()) cuerpo.append("<p>Marca: ").append(xe(marca)).append("</p>");
        cuerpo.append("<p>Envío a todo Costa Rica con HOTCLICK.</p>");
        return cuerpo.toString();
    }

    /** Página de negocio o producto de prueba pedida por URL: noindex, sin schema ni hreflang, sin datos del negocio. */
    public String injectNoindexPrueba(String html, String path) {
        return injectPagina(html, SITIO, "Página no disponible para buscadores.", path, "noindex, nofollow", null);
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

        String imagen = urlHttp(e.getImagenUrl()) ? e.getImagenUrl() : appUrl + RUTA_OG_IMAGE;
        String url = appUrl + "/blog/" + (e.getSlug() != null ? e.getSlug() : e.getId());

        String seoBlock = SEO_START + "\n"
            + metasPagina(title, desc, ROBOTS_INDEX_SIMPLE, url, "article", imagen, SITIO, titulo) + SALTO_INDENT
            + SEO_END;
        String cuerpo = "<h1>" + xe(titulo) + H1_P + xe(desc) + "</p>";
        return render(html, seoBlock, cuerpo);
    }

    public String injectTiendaMeta(String html, Empresa empresa, String requestPath) {
        if (empresa.isEsPrueba()) {
            return injectNoindexPrueba(html, RUTA_TIENDA + empresa.getSlug());
        }
        String productoId = idProductoTienda(empresa.getSlug(), requestPath);
        if (productoId != null) {
            return injectPagina(html,
                "Producto | HOTCLICK",
                "Ficha del producto en HotClick.",
                RUTA_PRODUCTOS + productoId,
                ROBOTS_INDEX_SIMPLE,
                null);
        }
        if (esRutaPrivadaTienda(requestPath)) {
            return injectPagina(html, "Tienda | HOTCLICK", "Carrito de la tienda.", RUTA_TIENDA + empresa.getSlug(), "noindex, follow", null);
        }
        return injectTiendaHome(html, empresa);
    }

    public String injectSector(String html, SectorDetalle sector) {
        String title = sector.nombre() + " en Costa Rica — comprá en línea | HotClick";
        String desc = recortar(sector.descripcion(), 155);
        String path = "/comprar/" + sector.slug();
        return injectPagina(html, title, desc, path, ROBOTS_INDEX_SIMPLE, jsonSector(sector, desc, path));
    }

    public String injectProvincia(String html, ProvinciaSeo provincia) {
        String title = "Tiendas en " + provincia.nombre() + ", Costa Rica | HotClick";
        String desc = "Tiendas en línea de emprendedores, pymes y negocios en " + provincia.nombre()
            + ", Costa Rica. Comprá en HotClick con envío a todo el país.";
        String path = "/tiendas/" + provincia.slug();
        return injectPagina(html, title, desc, path, ROBOTS_INDEX_SIMPLE, jsonProvincia(title, desc, provincia));
    }

    public String injectBuscarProducto(String html) {
        String title = "Buscar un producto en Costa Rica | HotClick";
        String desc = "Si no está en el catálogo, HotClick lo busca entre emprendedores, pymes y negocios. El servicio es gratis.";
        String json = servicioConFaq("Búsqueda de producto", desc, "/servicios/buscar-producto",
            "¿Cómo encuentra HotClick un producto que no está publicado?");
        return injectPagina(html, title, desc, "/servicios/buscar-producto", ROBOTS_INDEX_SIMPLE, json);
    }

    public String injectDigitalizarInventario(String html) {
        String title = "Digitalizar inventario para vender en línea | HotClick";
        String desc = "HotClick digitaliza el inventario en tu local: códigos, SKU y etiquetas para productos sin código de barras.";
        String json = servicioConFaq("Digitalización de inventario", desc, "/servicios/digitalizar-inventario",
            "¿Qué es digitalizar el inventario?");
        return injectPagina(html, title, desc, "/servicios/digitalizar-inventario", ROBOTS_INDEX_SIMPLE, json);
    }

    /** Landing de vendedor (/emprende, /para-pymes, /planes…): title, description, canonical y og:url de su ruta. */
    public String injectLandingPlan(String html, String title, String desc, String path) {
        String url = appUrl + path;
        String pagina = "{\"@type\":\"WebPage\",\"name\":\"" + escJson(titular(title))
            + JSON_SEP_DESC + escJson(desc) + JSON_SEP_URL + escJson(url)
            + "\",\"inLanguage\":\"es-CR\",\"isPartOf\":{\"@type\":\"WebSite\",\"name\":\"HOTCLICK\",\"url\":\""
            + escJson(appUrl + "/") + "\"}}";
        String migas = JSON_MIGAS_INI
            + miga(1, MIGA_INICIO, appUrl + "/") + "," + miga(2, titular(title), url) + "]}";
        String json = JSON_GRAPH_INI + pagina + "," + migas + "]}";
        return injectPagina(html, title, desc, path, ROBOTS_INDEX_SIMPLE, json);
    }

    public String injectNoindex(String html, String title, String desc, String path) {
        return injectPagina(html, title, desc, path, "noindex, follow", null);
    }

    /** Meta noindex para PDP inexistente (acompaña HTTP 404). */
    public String injectProductNotFoundMeta(String html, String id) {
        String url = appUrl + RUTA_PRODUCTOS + (id != null ? id : "");
        String title = "Producto no encontrado | HOTCLICK";
        String desc = "Este producto no está disponible en HotClick.";
        String seoBlock = SEO_START + "\n"
            + metasPagina(title, desc, "noindex, follow", url, "website", appUrl + RUTA_OG_IMAGE, SITIO, null) + SALTO_INDENT
            + SEO_END;
        return render(html, seoBlock, "<h1>" + xe(title) + H1_P + xe(desc) + "</p>");
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
        String path = RUTA_TIENDA + empresa.getSlug();
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
            + JSON_SEP_URL + escJson(url)
            + "\",\"image\":\"" + escJson(imagen)
            + JSON_SEP_DESC + escJson(desc)
            + "\",\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        String migas = JSON_MIGAS_INI
            + miga(1, MIGA_INICIO, appUrl + "/") + ","
            + miga(2, "Negocios", appUrl + "/emprendimientos") + ","
            + miga(3, nombre, url) + "]}";
        String json = JSON_GRAPH_INI + tienda + "," + migas + "]}";
        String cuerpo = "<h1>" + xe(nombre) + H1_P + xe(desc) + "</p>"
            + "<p>Tienda en línea en Costa Rica, con envío a todo el país por HOTCLICK.</p>";
        return paginaCore(html, title, desc, path, ROBOTS_INDEX_SIMPLE, json, imagen, nombre, cuerpo);
    }

    private String injectPagina(String html, String title, String description, String path, String robots, String jsonLd) {
        return injectPagina(html, title, description, path, robots, jsonLd, appUrl + RUTA_OG_IMAGE, SITIO);
    }

    private String injectPagina(String html, String title, String description, String path, String robots,
                                String jsonLd, String imagen, String siteName) {
        String cuerpo = "<h1>" + xe(titular(title)) + H1_P + xe(description) + "</p>"
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
            + extra + SALTO_INDENT + SEO_END;
        return render(html, seoBlock, cuerpo);
    }

    /** title, description, robots, canonical, hreflang (solo indexables), Open Graph y Twitter de UNA página. */
    private String metasPagina(String title, String description, String robots, String url, String ogType,
                               String imagen, String siteName, String imageAlt) {
        StringBuilder sb = new StringBuilder()
            .append("    <title>").append(xe(title)).append("</title>\n")
            .append("    <meta name=\"description\" content=\"").append(xa(description)).append(META_CIERRE)
            .append("    <meta name=\"robots\" content=\"").append(xa(robots)).append(META_CIERRE)
            .append("    <link rel=\"canonical\" href=\"").append(xa(url)).append(META_CIERRE);
        if (robots != null && !robots.startsWith("noindex")) {
            // Un solo idioma real (es-CR): sin URLs /en ni /pt. x-default y es-CR apuntan a ESTA página.
            sb.append("    <link rel=\"alternate\" hreflang=\"es-CR\" href=\"").append(xa(url)).append(META_CIERRE)
              .append("    <link rel=\"alternate\" hreflang=\"x-default\" href=\"").append(xa(url)).append(META_CIERRE);
        }
        sb.append("    <meta property=\"og:title\" content=\"").append(xa(title)).append(META_CIERRE)
          .append("    <meta property=\"og:description\" content=\"").append(xa(description)).append(META_CIERRE)
          .append("    <meta property=\"og:type\" content=\"").append(xa(ogType)).append(META_CIERRE)
          .append("    <meta property=\"og:url\" content=\"").append(xa(url)).append(META_CIERRE)
          .append("    <meta property=\"og:image\" content=\"").append(xa(imagen)).append(META_CIERRE);
        if (imageAlt != null) {
            sb.append("    <meta property=\"og:image:alt\" content=\"").append(xa(imageAlt)).append(META_CIERRE);
        }
        sb.append("    <meta property=\"og:locale\" content=\"es_CR\" />\n")
          .append("    <meta property=\"og:site_name\" content=\"").append(xa(siteName)).append(META_CIERRE)
          .append("    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n")
          .append("    <meta name=\"twitter:site\" content=\"@hotclickcr\" />\n")
          .append("    <meta name=\"twitter:title\" content=\"").append(xa(title)).append(META_CIERRE)
          .append("    <meta name=\"twitter:description\" content=\"").append(xa(description)).append(META_CIERRE)
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
        return JSON_GRAPH_INI
            + coleccion(sector.nombre(), desc, url) + ","
            + migas(url, sector.nombre()) + ","
            + listaProductos(sector) + "]}";
    }

    private String jsonProvincia(String title, String desc, ProvinciaSeo provincia) {
        String area = "{\"@type\":\"AdministrativeArea\",\"name\":\"" + escJson(provincia.nombre())
            + "\",\"containedInPlace\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        return "{\"@context\":\"https://schema.org\",\"@type\":\"CollectionPage\",\"name\":\""
            + escJson(title) + JSON_SEP_DESC + escJson(desc) + "\",\"areaServed\":" + area + "}";
    }

    private String servicioConFaq(String nombre, String desc, String path, String pregunta) {
        String servicio = "{\"@type\":\"Service\",\"name\":\"" + escJson(nombre)
            + JSON_SEP_DESC + escJson(desc)
            + JSON_SEP_URL + escJson(appUrl + path)
            + "\",\"provider\":{\"@type\":\"Organization\",\"name\":\"HOTCLICK\",\"url\":\"" + escJson(appUrl + "/")
            + "\"},\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        String faq = "{\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\""
            + escJson(pregunta) + "\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"" + escJson(desc) + "\"}}]}";
        return JSON_GRAPH_INI + servicio + "," + faq + "]}";
    }

    private static String coleccion(String nombre, String desc, String url) {
        return "{\"@type\":\"CollectionPage\",\"name\":\"" + escJson(nombre)
            + JSON_SEP_DESC + escJson(desc) + JSON_SEP_URL + escJson(url) + "\"}";
    }

    private String migas(String url, String nombre) {
        return JSON_MIGAS_INI
            + miga(1, MIGA_INICIO, appUrl + "/") + ","
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
                .append(JSON_SEP_URL).append(escJson(appUrl + RUTA_PRODUCTOS + producto.id())).append("\"}");
        }
        return "{\"@type\":\"ItemList\",\"name\":\"" + escJson(sector.nombre() + " en Costa Rica")
            + "\",\"numberOfItems\":" + mostrados + ",\"itemListElement\":[" + items + "]}";
    }

    private static String idProductoTienda(String slug, String path) {
        if (path == null || slug == null) return null;
        String marca = RUTA_TIENDA + slug + "/producto/";
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
        return appUrl + RUTA_OG_IMAGE;
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
