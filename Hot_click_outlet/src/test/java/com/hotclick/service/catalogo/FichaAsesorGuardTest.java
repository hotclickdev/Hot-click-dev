package com.hotclick.service.catalogo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Ficha del asesor: productoId del cliente solo si el producto es público y está activo")
class FichaAsesorGuardTest {

    @Test
    void marketplaceExigeProductoActivoVisibleYTiendaActivaPublica() {
        String w = CatalogoChatSql.whereFichaAsesor(true);
        assertThat(w).contains("p.fk_id_estado = 1").contains("p.visible_catalogo = TRUE")
            .contains("emp.estado_empresa = 'ACTIVO'").contains("emp.visibilidad_publica = TRUE");
    }

    @Test
    void tiendaExigeProductoActivoVisibleYDeEsaEmpresa() {
        String w = CatalogoChatSql.whereFichaAsesor(false);
        assertThat(w).contains("p.fk_id_estado = 1").contains("p.visible_catalogo = TRUE").contains("p.fk_id_empresa = ?");
    }
}
