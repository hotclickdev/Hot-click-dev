package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V101 search_vector de ficha")
class ChatSearchVectorMigrationTest {

    @Test
    @DisplayName("La migración recrea search_vector con descripcion_larga, especificaciones y como_usar")
    void v101_incluyeFicha() throws Exception {
        Path path = Path.of("src/main/resources/db/migration/V101__chat_search_vector_ficha.sql");
        String sql = Files.readString(path);
        assertThat(sql).contains("DROP COLUMN IF EXISTS search_vector");
        assertThat(sql).contains("descripcion_larga");
        assertThat(sql).contains("especificaciones");
        assertThat(sql).contains("como_usar");
        assertThat(sql).contains("idx_producto_fts");
    }
}
