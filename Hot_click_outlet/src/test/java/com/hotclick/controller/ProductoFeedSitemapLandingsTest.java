package com.hotclick.controller;

import com.hotclick.repository.BlogEntradaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.seo.SeoPublicoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("El sitemap lista las landings de vendedor")
class ProductoFeedSitemapLandingsTest {

    private static ProductoFeedController controller(SeoPublicoService seo) {
        ProductoRepository productos = mock(ProductoRepository.class);
        when(productos.findActivosVisibles()).thenReturn(List.of());
        BlogEntradaRepository blog = mock(BlogEntradaRepository.class);
        when(blog.findByPublicadoTrueAndEstadoOrderByFechaPublicacionDesc(1)).thenReturn(List.of());
        ProductoFeedController c = new ProductoFeedController();
        ReflectionTestUtils.setField(c, "productoRepository", productos);
        ReflectionTestUtils.setField(c, "blogEntradaRepository", blog);
        ReflectionTestUtils.setField(c, "seoPublicoService", seo);
        ReflectionTestUtils.setField(c, "appUrl", "https://hotclick.lat");
        return c;
    }

    @Test
    void sitemap_incluyeLandingsDeVendedorYParaNegocios() {
        SeoPublicoService seo = mock(SeoPublicoService.class);
        when(seo.rutasSitemap()).thenReturn(List.of("/tienda/cafe-del-valle"));

        String xml = controller(seo).sitemap().getBody();

        assertThat(xml)
            .contains("<loc>https://hotclick.lat/emprende</loc>")
            .contains("<loc>https://hotclick.lat/para-pymes</loc>")
            .contains("<loc>https://hotclick.lat/negocio-plus-plan</loc>")
            .contains("<loc>https://hotclick.lat/para-negocios</loc>")
            .contains("/tienda/cafe-del-valle");
    }

    @Test
    void sitemapDeRespaldo_tambienTraeLasLandings() {
        SeoPublicoService seo = mock(SeoPublicoService.class);
        ProductoFeedController c = controller(seo);
        ProductoRepository rota = mock(ProductoRepository.class);
        when(rota.findActivosVisibles()).thenThrow(new IllegalStateException("db caída"));
        ReflectionTestUtils.setField(c, "productoRepository", rota);

        String xml = c.sitemap().getBody();

        assertThat(xml).contains("/emprende", "/para-pymes", "/negocio-plus-plan", "/para-negocios");
    }
}
