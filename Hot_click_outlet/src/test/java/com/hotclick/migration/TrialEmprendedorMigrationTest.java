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
}
