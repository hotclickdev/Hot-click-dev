package com.hotclick.service.producto;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("ProductoCatalogQueries - tiendas visibles por producto")
class ProductoCatalogQueriesTiendasTest {

    private static Producto producto(long id, long empresaId, boolean visible, String slug) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        e.setNombreEmpresa("Legal " + empresaId);
        e.setNombreComercial("Tienda " + empresaId);
        e.setVisibilidadPublica(visible);
        e.setSlug(slug);
        Producto p = new Producto();
        p.setId(id);
        p.setEmpresa(e);
        return p;
    }

    @Test
    @DisplayName("Solo negocios visibles con slug y distintos de la tienda principal")
    void soloVisibles() {
        ProductoRepository repo = mock(ProductoRepository.class);
        ProductoCatalogQueries queries = new ProductoCatalogQueries(repo);
        ReflectionTestUtils.setField(queries, "empresaPrincipalId", 1L);
        when(repo.findAllById(anyCollection())).thenReturn(List.of(
            producto(10L, 7L, true, "t7"), producto(11L, 8L, false, "t8"), producto(12L, 1L, true, "hc"), producto(13L, 9L, true, null)));

        assertThat(queries.tiendasVisibles(List.of(10L, 11L, 12L, 13L))).containsExactlyEntriesOf(java.util.Map.of(10L, "Tienda 7"));
    }

    @Test
    @DisplayName("Sin ids no consulta")
    void sinIds() {
        ProductoRepository repo = mock(ProductoRepository.class);
        assertThat(new ProductoCatalogQueries(repo).tiendasVisibles(List.of())).isEmpty();
        verify(repo, never()).findAllById(anyCollection());
    }
}
