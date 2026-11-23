package com.hotclick.seo;

import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("El sitemap no lista tiendas de prueba (slug prueba-andres-*)")
class SeoPublicoServiceSitemapPruebaTest {

    private static Object[] fila(String slug) {
        return new Object[] {slug, "Nombre " + slug, "", "", "San José"};
    }

    @Test
    void rutasSitemap_omiteSlugsPruebaAndresSinImportarMayusculas() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        CategoriaRepository categorias = mock(CategoriaRepository.class);
        when(empresas.findTiendasPublicasSeo()).thenReturn(List.of(
            fila("cafe-del-valle"), fila("prueba-andres-1"), fila("Prueba-Andres-Dos"), fila("andres-tienda")));
        when(categorias.findSectoresIndexables(anyInt())).thenReturn(List.of());

        var servicio = new SeoPublicoService(empresas, categorias, mock(ProductoRepository.class));

        assertThat(servicio.rutasSitemap())
            .contains("/tienda/cafe-del-valle", "/tienda/andres-tienda")
            .noneMatch(r -> r.toLowerCase().contains("prueba-andres-"));
    }
}
