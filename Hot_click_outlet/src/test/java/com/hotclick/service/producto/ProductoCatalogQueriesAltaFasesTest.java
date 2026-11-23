package com.hotclick.service.producto;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Fichas públicas de producto: un negocio en borrador no es público")
class ProductoCatalogQueriesAltaFasesTest {

    @Test
    void fichaDeBorradorNoEsPublica() {
        Empresa e = new Empresa();
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setAltaPorFases(true);
        e.setVentaOnlineHabilitada(false);
        Producto p = new Producto();
        p.setVisibleCatalogo(true);
        p.setEmpresa(e);
        assertThat(ProductoCatalogQueries.esPublico(p)).isFalse();
        e.setVentaOnlineHabilitada(true);
        assertThat(ProductoCatalogQueries.esPublico(p)).isTrue();
    }
}
