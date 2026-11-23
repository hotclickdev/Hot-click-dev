package com.hotclick.seo;

import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("La landing de sector no lista productos de negocios es_prueba")
class SeoPublicoServiceSectorPruebaTest {

    @Test
    void sectorDescartaProductosDeNegociosDePrueba() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        CategoriaRepository categorias = mock(CategoriaRepository.class);
        ProductoRepository productos = mock(ProductoRepository.class);
        when(categorias.findSectoresIndexables(anyInt())).thenReturn(List.<Object[]>of(
            new Object[] {"tecnologia", "Tecnología", "", 5L}));
        when(productos.findProductosDeSector(eq("tecnologia"), any())).thenReturn(List.<Object[]>of(
            new Object[] {1L, "Real", 1000, ""}, new Object[] {2L, "De prueba", 2000, ""}));
        when(empresas.findIdsProductosDeEmpresasPrueba(any())).thenReturn(List.of(2L));

        var detalle = new SeoPublicoService(empresas, categorias, productos).sector("tecnologia").orElseThrow();

        assertThat(detalle.productos()).extracting("nombre").containsExactly("Real");
    }

    /**
     * LAGUNA CONOCIDA (archivos de otra rama/PR, no se editan aquí): {@code ProductoRepository.findParaFeed},
     * {@code findActivosVisibles} (feed Merchant y sitemap) y {@code CategoriaRepository.findSectoresIndexables}
     * (conteo de la landing) no filtran {@code es_prueba}. Ver docs/seo/notas-conflicto-pr-seo-geo.md.
     */
    @Test
    void lagunaDocumentada_feedYSitemapDeProductosNoFiltranEsPruebaTodavia() throws Exception {
        String sql = String.join(" ", ProductoRepository.class.getMethod("findParaFeed")
            .getAnnotation(org.springframework.data.jpa.repository.Query.class).value());
        assertThat(sql).as("cuando se arregle en ProductoRepository, cambiar este test a isTrue()")
            .doesNotContain("esPrueba");
    }
}
