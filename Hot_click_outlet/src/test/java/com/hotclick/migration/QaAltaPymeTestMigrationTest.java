package com.hotclick.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V235 excepción QA PYME TEST: migración aditiva, un fixture, sin tocar datos vivos")
class QaAltaPymeTestMigrationTest {

    @Test
    @DisplayName("V235 crea la tabla y una fila, y no borra ni reescribe negocios")
    void aditiva() throws IOException {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V235__qa_alta_pyme_test.sql"));
        String ejecutable = sql.lines().filter(l -> !l.trim().startsWith("--"))
            .reduce("", (a, b) -> a + "\n" + b).toUpperCase();
        assertThat(ejecutable).contains("CREATE TABLE IF NOT EXISTS HOT_CLICK_QA_ALTA_PYME_TEST_TB");
        assertThat(ejecutable).contains("CREATE UNIQUE INDEX IF NOT EXISTS UQ_QA_ALTA_PYME_TEST_CORREO");
        assertThat(ejecutable).contains("QA.SIM.ALTA20261108@HOTCLICK.TEST");
        assertThat(ejecutable).contains("'PYME'");
        assertThat(ejecutable).contains("TIMESTAMP '2026-11-30 23:59:59'");
        assertThat(ejecutable).contains("WHERE NOT EXISTS");
        assertThat(ejecutable).doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE")
            .doesNotContain("UPDATE ");
        assertThat(sql).doesNotContain("qa.pyme.demo").doesNotContain("emp13").doesNotContain("emp20");
    }

    @Test
    @DisplayName("V235 es el único archivo con ese número y Actualizado.sql lleva el mismo bloque")
    void unicaYEnActualizado() throws IOException {
        String[] archivos = Path.of("src/main/resources/db/migration").toFile()
            .list((d, n) -> n.startsWith("V235__"));
        assertThat(archivos).containsExactly("V235__qa_alta_pyme_test.sql");
        String actualizado = Files.readString(Path.of("Actualizado.sql"));
        assertThat(actualizado).contains("V235 (08-nov-2026) Excepción QA de un solo uso");
        assertThat(actualizado).contains("qa.sim.alta20261108@hotclick.test");
        assertThat(actualizado).contains("hot_click_qa_alta_pyme_test_tb");
    }
}
