package com.hotclick.migration;

import com.hotclick.model.AiUso;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V209 — tokens_entrada/tokens_salida de hot_click_ai_uso_tb son BIGINT")
class AiUsoTokensBigintMigrationTest {

    @Test
    @DisplayName("La migración amplía ambas columnas a BIGINT y no borra nada")
    void migracionAmplia() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V209__ai_uso_tokens_bigint.sql"));
        String codigo = sql.lines().filter(l -> !l.trim().startsWith("--")).reduce("", (a, b) -> a + "\n" + b);
        assertThat(codigo).containsPattern("(?i)ALTER\\s+TABLE\\s+hot_click_ai_uso_tb\\s+ALTER\\s+COLUMN\\s+tokens_entrada\\s+TYPE\\s+BIGINT");
        assertThat(codigo).containsPattern("(?i)ALTER\\s+TABLE\\s+hot_click_ai_uso_tb\\s+ALTER\\s+COLUMN\\s+tokens_salida\\s+TYPE\\s+BIGINT");
        assertThat(codigo).doesNotContainPattern("(?i)\\b(DROP|DELETE|TRUNCATE|UPDATE)\\b");
    }

    @Test
    @DisplayName("La entidad AiUso mapea los dos contadores como Long (H2 en tests crea BIGINT)")
    void entidadUsaLong() throws Exception {
        assertThat(AiUso.class.getDeclaredField("tokensEntrada").getType()).isEqualTo(Long.class);
        assertThat(AiUso.class.getDeclaredField("tokensSalida").getType()).isEqualTo(Long.class);
        AiUso uso = new AiUso();
        uso.setTokensEntrada(3_000_000_000L);
        assertThat(uso.getTokensEntrada()).isGreaterThan(Integer.MAX_VALUE);
    }
}
