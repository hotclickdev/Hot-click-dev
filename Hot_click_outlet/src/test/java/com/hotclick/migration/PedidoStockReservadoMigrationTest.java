package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V229 pedido.stock_reservado_en: aditiva, backfill acotado y duplicada en Actualizado.sql")
class PedidoStockReservadoMigrationTest {

    private static String sinComentarios(String ruta) throws IOException {
        return Files.readString(Path.of(ruta)).lines()
            .filter(l -> !l.trim().startsWith("--")).collect(Collectors.joining("\n")).toUpperCase();
    }

    @Test
    @DisplayName("V229 agrega una columna nullable y solo marca pedidos ONLINE pendientes sin descontar")
    void v229Aditiva() throws IOException {
        String sql = sinComentarios("src/main/resources/db/migration/V229__pedido_stock_reservado_en.sql");
        assertThat(sql).contains("ALTER TABLE HOT_CLICK_PEDIDO_TB ADD COLUMN IF NOT EXISTS STOCK_RESERVADO_EN TIMESTAMP");
        assertThat(sql).doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE")
            .doesNotContain("NOT NULL;");
        assertThat(sql).contains("STOCK_RESERVADO_EN IS NULL").contains("STOCK_DESCONTADO_EN IS NULL")
            .contains("COALESCE(ORIGEN, 'ONLINE') = 'ONLINE'")
            .contains("ESTADO_PEDIDO IN ('PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION')");
    }

    @Test
    @DisplayName("Actualizado.sql lleva el mismo bloque V229")
    void actualizadoLlevaV229() throws IOException {
        assertThat(Files.readString(Path.of("Actualizado.sql"))).contains("V229 (04-nov-2026) ALTO-01");
        assertThat(sinComentarios("Actualizado.sql"))
            .contains("ALTER TABLE HOT_CLICK_PEDIDO_TB ADD COLUMN IF NOT EXISTS STOCK_RESERVADO_EN TIMESTAMP");
    }
}
