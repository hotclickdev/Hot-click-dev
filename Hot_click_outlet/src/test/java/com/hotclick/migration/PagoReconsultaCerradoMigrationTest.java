package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V223 pago_reconsulta_cerrado_en: aditiva y duplicada en Actualizado.sql")
class PagoReconsultaCerradoMigrationTest {

    private static String sinComentarios(String ruta) throws IOException {
        return Files.readString(Path.of(ruta)).lines()
            .filter(l -> !l.trim().startsWith("--")).collect(Collectors.joining("\n")).toUpperCase();
    }

    @Test
    @DisplayName("V223 solo agrega una columna nullable, nada destructivo")
    void v223Aditiva() throws IOException {
        String sql = sinComentarios("src/main/resources/db/migration/V223__pago_reconsulta_cerrado_en.sql");
        assertThat(sql).contains("ALTER TABLE HOT_CLICK_PAGO_TB ADD COLUMN IF NOT EXISTS RECONSULTA_CERRADO_EN TIMESTAMP");
        assertThat(sql).doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE")
            .doesNotContain("NOT NULL").doesNotContain("UPDATE ");
    }

    @Test
    @DisplayName("Actualizado.sql lleva el mismo bloque V223")
    void actualizadoLlevaV223() throws IOException {
        assertThat(Files.readString(Path.of("Actualizado.sql"))).contains("V223 (03-nov-2026) BAJO QA7-B1 (b)");
        assertThat(sinComentarios("Actualizado.sql"))
            .contains("ALTER TABLE HOT_CLICK_PAGO_TB ADD COLUMN IF NOT EXISTS RECONSULTA_CERRADO_EN TIMESTAMP");
    }
}
