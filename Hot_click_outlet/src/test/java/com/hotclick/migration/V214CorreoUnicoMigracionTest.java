package com.hotclick.migration;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/** B9: V214 crea el índice único sobre lower(correo) y es puramente aditiva (sin UPDATE/DELETE/DROP sobre datos). */
class V214CorreoUnicoMigracionTest {

    static final Path V214 = Path.of("src/main/resources/db/migration/V214__usuario_correo_unico_sin_mayusculas.sql");

    static String sinComentarios() throws Exception {
        return Files.readString(V214).replaceAll("(?m)--.*$", "").toLowerCase(Locale.ROOT);
    }

    @Test
    void creaIndiceUnicoSobreLowerCorreoSoloNoEliminados() throws Exception {
        String sql = sinComentarios().replaceAll("\\s+", " ");
        assertThat(sql).contains("create unique index if not exists uq_usuario_lower_correo_no_eliminado");
        assertThat(sql).contains("on hot_click_usuario_tb (lower(correo)) where fk_id_estado <> 3");
    }

    @Test
    void esAditiva() throws Exception {
        String sql = sinComentarios();
        assertThat(sql).doesNotContain("update ", "delete ", "drop ", "truncate ", "alter table");
    }
}
