package com.hotclick.seo;

import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("El sitemap sale de las tiendas que devuelve el repositorio (el filtro es_prueba vive en la query)")
class SeoPublicoServiceSitemapPruebaTest {

    @Test
    void rutasSitemap_listaLasTiendasDelRepositorio() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        CategoriaRepository categorias = mock(CategoriaRepository.class);
        when(empresas.findTiendasPublicasSeo()).thenReturn(List.<Object[]>of(
            new Object[] {"cafe-del-valle", "Café", "", "", "San José"}));
        when(categorias.findSectoresIndexables(anyInt())).thenReturn(List.of());

        var servicio = new SeoPublicoService(empresas, categorias, mock(ProductoRepository.class));

        assertThat(servicio.rutasSitemap()).contains("/tienda/cafe-del-valle");
    }

    @Test
    void queryDeTiendasPublicas_excluyeEmpresasDePrueba() throws Exception {
        Method m = EmpresaRepository.class.getMethod("findTiendasPublicasSeo");
        String sql = String.join(" ", m.getAnnotation(org.springframework.data.jpa.repository.Query.class).value());
        assertThat(sql).contains("e.es_prueba = FALSE");
    }
}
