package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.*;

/**
 * F33-01 — Migraciones V50–V53: validar que existen y contienen el SQL correcto.
 *
 * No requiere BD — lee los archivos SQL del classpath de producción.
 */
@DisplayName("F33-01 / F32-01 / FIX-19 — Migraciones Flyway V50–V53 existen y tienen SQL correcto")
class MigrationSqlTest {

    private static final String MIGRATION_DIR =
        "src/main/resources/db/migration/";

    // ── V50: índices de escala ────────────────────────────────────────────────

    @Test
    @DisplayName("V50__indexes_escala.sql existe y contiene los 4 índices compuestos")
    void v50_indexes_exist() throws IOException {
        String sql = readMigration("V50__indexes_escala.sql");

        assertThat(sql).contains("idx_producto_empresa_estado");
        assertThat(sql).contains("idx_producto_empresa_stock");
        assertThat(sql).contains("idx_usuario_empresa_estado");
        assertThat(sql).contains("idx_empresa_estado");
        assertThat(sql).contains("CREATE INDEX IF NOT EXISTS");
        // Los dos índices de producto tienen WHERE parcial
        assertThat(sql).contains("WHERE fk_id_estado = 1");
    }

    // ── V51: secuencias batch ─────────────────────────────────────────────────

    @Test
    @DisplayName("V51__sequences_batch.sql existe con las 3 secuencias (allocationSize=50)")
    void v51_sequences_exist() throws IOException {
        String sql = readMigration("V51__sequences_batch.sql");

        assertThat(sql).contains("hot_click_pedido_item_seq");
        assertThat(sql).contains("hot_click_movimiento_stock_seq");
        assertThat(sql).contains("hot_click_ai_mensaje_seq");
        assertThat(sql).contains("INCREMENT BY 50");
        assertThat(sql).contains("CREATE SEQUENCE IF NOT EXISTS");
        // Sincronización con filas existentes (idempotente)
        assertThat(sql).contains("setval");
    }

    // ── V52: rate limit table ─────────────────────────────────────────────────

    @Test
    @DisplayName("V52__rate_limit_table.sql existe con PRIMARY KEY en bucket_key")
    void v52_rateLimit_exists() throws IOException {
        String sql = readMigration("V52__rate_limit_table.sql");

        assertThat(sql).contains("hot_click_rate_limit_tb");
        assertThat(sql).contains("bucket_key");
        assertThat(sql).contains("PRIMARY KEY");
        assertThat(sql).contains("window_start");
        assertThat(sql).contains("expires_at");
        assertThat(sql).contains("idx_rl_expires");
    }

    // ── V53: webhook retry counter ────────────────────────────────────────────

    @Test
    @DisplayName("V53__webhook_retry_count.sql existe con intentos_reintento y índice parcial")
    void v53_webhookRetry_exists() throws IOException {
        String sql = readMigration("V53__webhook_retry_count.sql");

        assertThat(sql).contains("hot_click_webhook_event_tb");
        assertThat(sql).contains("intentos_reintento");
        assertThat(sql).contains("INTEGER");
        assertThat(sql).contains("DEFAULT 0");
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS");
        // Índice parcial para queries de retry eficientes
        assertThat(sql).contains("idx_webhook_pendientes_reintento");
        assertThat(sql).contains("WHERE procesado = false");
    }

    // ── Sin gaps en secuencia V1–V53 ─────────────────────────────────────────

    @Test
    @DisplayName("Todas las migraciones V50–V53 existen (sin gaps)")
    void v50_to_v53_noGaps() {
        assertThat(migrationExists("V50__indexes_escala.sql")).isTrue();
        assertThat(migrationExists("V51__sequences_batch.sql")).isTrue();
        assertThat(migrationExists("V52__rate_limit_table.sql")).isTrue();
        assertThat(migrationExists("V53__webhook_retry_count.sql")).isTrue();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String readMigration(String filename) throws IOException {
        Path path = Paths.get(MIGRATION_DIR + filename);
        assertThat(path.toFile()).as("Migration file should exist: " + filename).exists();
        return Files.readString(path);
    }

    private boolean migrationExists(String filename) {
        return Paths.get(MIGRATION_DIR + filename).toFile().exists();
    }
}
