package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V215 pago_reembolso_parcial: aditiva y duplicada en Actualizado.sql")
class PagoReembolsoParcialMigrationTest {

    private static String sinComentarios(String ruta) throws IOException {
        return Files.readString(Path.of(ruta)).lines()
            .filter(l -> !l.trim().startsWith("--")).collect(Collectors.joining("\n")).toUpperCase();
    }

    @Test
    @DisplayName("V215 solo agrega dos columnas nullables, nada destructivo")
    void v215Aditiva() throws IOException {
        String sql = sinComentarios("src/main/resources/db/migration/V215__pago_reembolso_parcial.sql");
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS MONTO_REEMBOLSO_PENDIENTE INTEGER");
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS MONTO_REEMBOLSADO INTEGER");
        assertThat(sql).doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE")
            .doesNotContain("NOT NULL").doesNotContain("UPDATE ");
    }

    @Test
    @DisplayName("Actualizado.sql lleva el mismo bloque V215")
    void actualizadoLlevaV215() throws IOException {
        String sql = Files.readString(Path.of("Actualizado.sql"));
        assertThat(sql).contains("V215 Pago con reembolso parcial");
        String sinCom = sinComentarios("Actualizado.sql");
        assertThat(sinCom).contains("ALTER TABLE HOT_CLICK_PAGO_TB ADD COLUMN IF NOT EXISTS MONTO_REEMBOLSO_PENDIENTE INTEGER");
        assertThat(sinCom).contains("ALTER TABLE HOT_CLICK_PAGO_TB ADD COLUMN IF NOT EXISTS MONTO_REEMBOLSADO INTEGER");
    }
}
