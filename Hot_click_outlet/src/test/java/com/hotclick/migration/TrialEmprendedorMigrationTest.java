package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V206 trial Emprendedor: migración aditiva e idempotente")
class TrialEmprendedorMigrationTest {

    private static String leer(String ruta) throws IOException {
        return Files.readString(Path.of(ruta));
    }

    @Test
    @DisplayName("V206 solo agrega columnas NULL e índices, con UNIQUE en el puesto, y nada destructivo")
    void v206Aditiva() throws IOException {
        String sql = leer("src/main/resources/db/migration/V206__trial_emprendedor.sql").lines()
            .filter(l -> !l.trim().startsWith("--")).collect(java.util.stream.Collectors.joining("\n")).toUpperCase();
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS TRIAL_EMPRENDEDOR_HASTA DATE");
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS TRIAL_EMPRENDEDOR_POS INTEGER");
        assertThat(sql).contains("CREATE UNIQUE INDEX IF NOT EXISTS UQ_EMPRESA_TRIAL_EMPRENDEDOR_POS");
        assertThat(sql).doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE")
            .doesNotContain("DATE NOT NULL").doesNotContain("INTEGER NOT NULL").doesNotContain("UPDATE ");
    }

    @Test
    @DisplayName("Actualizado.sql lleva el mismo bloque V206")
    void actualizadoLlevaV206() throws IOException {
        String sql = leer("Actualizado.sql");
        assertThat(sql).contains("V206 Trial del plan Emprendedor");
        assertThat(sql).contains("trial_emprendedor_pos");
    }

    @Test
    @DisplayName("V207: columnas NULL, UNIQUE de titular y trigger de liberación; nada destructivo sobre datos")
    void v207Aditiva() throws IOException {
        String sql = leer("src/main/resources/db/migration/V207__cupo_emprendedor_un_puesto_por_persona.sql").lines()
            .filter(l -> !l.trim().startsWith("--")).collect(java.util.stream.Collectors.joining("\n")).toUpperCase();
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS TRIAL_EMPRENDEDOR_TITULAR_USUARIO BIGINT");
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS TRIAL_EMPRENDEDOR_TITULAR_CORREO VARCHAR(160)");
        assertThat(sql).contains("CREATE UNIQUE INDEX IF NOT EXISTS UQ_EMPRESA_TRIAL_EMPRENDEDOR_TITULAR_USUARIO");
        assertThat(sql).contains("CREATE UNIQUE INDEX IF NOT EXISTS UQ_EMPRESA_TRIAL_EMPRENDEDOR_TITULAR_CORREO");
        assertThat(sql).contains("AFTER DELETE ON HOT_CLICK_EMPRESA_TB");
        assertThat(sql).contains("USADOS > 0"); // nunca bajo 0
        assertThat(sql).doesNotContain("DROP ").doesNotContain("DELETE FROM").doesNotContain("TRUNCATE")
            .doesNotContain("BIGINT NOT NULL").doesNotContain("VARCHAR(160) NOT NULL");
        // Solo se toca el contador (liberación); ninguna fila de empresa se reescribe.
        assertThat(sql).doesNotContain("UPDATE HOT_CLICK_EMPRESA_TB");
    }

    @Test
    @DisplayName("Actualizado.sql lleva el mismo bloque V207")
    void actualizadoLlevaV207() throws IOException {
        String sql = leer("Actualizado.sql");
        assertThat(sql).contains("V207");
        assertThat(sql).contains("trial_emprendedor_titular_usuario");
        assertThat(sql).contains("fn_cupo_emprendedor_liberar_al_borrar");
    }

    @Test
    @DisplayName("V207 es el siguiente número libre: no hay dos migraciones V207 ni un hueco que la pise")
    void v207UnicaConEseNumero() {
        String[] v207 = Path.of("src/main/resources/db/migration").toFile()
            .list((d, n) -> n.startsWith("V207__"));
        assertThat(v207).hasSize(1);
    }
}
