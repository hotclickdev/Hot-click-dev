package com.hotclick.service.catalogo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Gate marketplace vs tienda del chat")
class CatalogoChatSqlTest {

    @Test
    @DisplayName("Marketplace usa visibilidad pública, no fk_id_empresa = ?")
    void marketplace_noFiltraUnaSolaEmpresa() {
        String where = CatalogoChatSql.whereVisible(true, false);
        assertThat(where).contains("visibilidad_publica");
        assertThat(where).contains("estado_empresa = 'ACTIVO'");
        assertThat(where).contains("fk_id_empresa IS NULL");
        assertThat(where).doesNotContain("p.fk_id_empresa = ?");
        assertThat(CatalogoChatSql.joins(true)).contains("hot_click_empresa_tb emp");
    }

    @Test
    @DisplayName("Tienda de emprendedor filtra por empresa")
    void tenant_filtraPorEmpresa() {
        String where = CatalogoChatSql.whereVisible(false, true);
        assertThat(where).contains("p.fk_id_empresa = ?");
        assertThat(where).doesNotContain("visibilidad_publica");
        assertThat(CatalogoChatSql.joins(false)).doesNotContain("hot_click_empresa_tb");

        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, 42L, false);
        assertThat(params).containsExactly(42L);

        params.clear();
        CatalogoChatSql.bindEmpresaSiTenant(params, 42L, true);
        assertThat(params).isEmpty();
    }

    @Test
    @DisplayName("Ficha de asesor no exige stock")
    void fichaAsesor_sinStock() {
        String where = CatalogoChatSql.whereFichaAsesor(true);
        assertThat(where).contains("visible_catalogo");
        assertThat(where).contains("visibilidad_publica");
        assertThat(where).doesNotContain("stock_actual");
        assertThat(where).doesNotContain("vendido");
    }

    @Test
    @DisplayName("ILIKE usa OR de ficha, no AND de toda la frase")
    void matchSql_esOrPorTermino() {
        String sql = ChatProductoMatchSql.orDeTerminos(2);
        assertThat(sql).contains(" OR ");
        assertThat(sql).contains("como_usar");
        assertThat(sql).contains("nombre_categoria");
        assertThat(sql).doesNotContain(" AND ");
    }
}
