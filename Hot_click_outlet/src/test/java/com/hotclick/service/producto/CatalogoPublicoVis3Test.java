package com.hotclick.service.producto;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import static org.assertj.core.api.Assertions.assertThat;

/** VIS-3b/3c: destacados, carrusel y recomendaciones usan el filtro del catálogo público. */
class CatalogoPublicoVis3Test {

    private static Producto prod(boolean visible, String estadoEmpresa, boolean empresaVisible) {
        Empresa e = new Empresa();
        e.setEstadoEmpresa(estadoEmpresa);
        e.setVisibilidadPublica(empresaVisible);
        Producto p = new Producto();
        p.setVisibleCatalogo(visible);
        p.setEmpresa(e);
        return p;
    }

    @Test
    void recomendacionesSoloProductosPublicos() {
        assertThat(ProductoCatalogQueries.esPublico(prod(true, "ACTIVO", true))).isTrue();
        assertThat(ProductoCatalogQueries.esPublico(prod(false, "ACTIVO", true))).isFalse();
        assertThat(ProductoCatalogQueries.esPublico(prod(true, "PENDIENTE", true))).isFalse();
        assertThat(ProductoCatalogQueries.esPublico(prod(true, "ACTIVO", false))).isFalse();
        assertThat(ProductoCatalogQueries.esPublico(new Producto())).isFalse();
    }

    @Test
    void destacadosYCarruselFiltranVisibleCatalogo() throws Exception {
        for (String m : new String[]{"findDestacadosPublicos", "findCarruselPublico"}) {
            String sql = ProductoRepository.class.getMethod(m, Integer.class).getAnnotation(Query.class).value();
            assertThat(sql).as(m).contains("visible_catalogo = TRUE").contains("estado_empresa = 'ACTIVO'");
        }
    }
}
