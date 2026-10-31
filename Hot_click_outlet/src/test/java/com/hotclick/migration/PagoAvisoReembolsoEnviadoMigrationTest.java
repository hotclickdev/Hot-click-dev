package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V217 pago_aviso_reembolso_enviado: aditiva y duplicada en Actualizado.sql justo después de V216")
class PagoAvisoReembolsoEnviadoMigrationTest {

    private static String sinComentarios(String sql) {
        return sql.lines().filter(l -> !l.trim().startsWith("--")).collect(Collectors.joining("\n")).toUpperCase();
    }

    @Test
    @DisplayName("V217 solo agrega columnas y hace backfill; intentos y resumen NOT NULL con default")
    void v217Aditiva() throws IOException {
        String sql = sinComentarios(Files.readString(Path.of("src/main/resources/db/migration/V217__pago_aviso_reembolso_enviado.sql")));
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS AVISO_REEMBOLSO_ADMIN_ENVIADO_EN TIMESTAMP")
            .contains("ADD COLUMN IF NOT EXISTS AVISO_REEMBOLSO_ADMIN_INTENTOS INTEGER NOT NULL DEFAULT 0")
            .contains("ADD COLUMN IF NOT EXISTS AVISO_REEMBOLSO_RESUMEN_PENDIENTE BOOLEAN NOT NULL DEFAULT FALSE")
            .doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE");
    }

    @Test
    @DisplayName("Actualizado.sql lleva el bloque V217 inmediatamente después de la columna de V216")
    void actualizadoLlevaV217TrasV216() throws IOException {
        String todo = Files.readString(Path.of("Actualizado.sql"));
        String v217 = Files.readString(Path.of("src/main/resources/db/migration/V217__pago_aviso_reembolso_enviado.sql"));
        int v216 = todo.indexOf("ADD COLUMN IF NOT EXISTS aviso_reembolso_admin_en TIMESTAMP;");
        int bloque = todo.indexOf(v217.trim());
        assertThat(v216).isPositive();
        assertThat(bloque).as("bloque V217 idéntico a la migración").isGreaterThan(v216);
        assertThat(todo.substring(v216, bloque)).doesNotContain("ALTER TABLE").doesNotContain("CREATE ");
    }
}
