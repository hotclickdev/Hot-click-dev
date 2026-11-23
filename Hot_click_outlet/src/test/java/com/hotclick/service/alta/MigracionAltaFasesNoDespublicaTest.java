package com.hotclick.service.alta;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Migraciones V244/V245: aditivas; los negocios existentes quedan como hoy (nada se despublica)")
class MigracionAltaFasesNoDespublicaTest {

    static final Path BASE = Path.of("src/main/resources/db/migration");

    static String sql(String nombre) throws Exception {
        return Files.readString(BASE.resolve(nombre));
    }

    @Test
    void v244DejaALosExistentesComoLegacyYVendiendo() throws Exception {
        String s = sql("V244__alta_negocio_por_fases.sql");
        assertThat(s).contains("alta_por_fases BOOLEAN NOT NULL DEFAULT FALSE");
        assertThat(s).contains("venta_online_habilitada BOOLEAN NOT NULL DEFAULT TRUE");
        // no toca estado, visibilidad ni producto de nadie
        assertThat(s.toLowerCase()).doesNotContain("visibilidad_publica").doesNotContain("estado_empresa")
            .doesNotContain("delete ").doesNotContain("drop ").doesNotContain("truncate");
        // el único UPDATE es sobre las cuentas ONVO ya ACTIVAS (anota fecha; no cambia su estado)
        assertThat(Pattern.compile("(?i)UPDATE\\s+(\\w+)").matcher(s).results().map(m -> m.group(1)).distinct().toList())
            .containsExactly("hot_click_empresa_cuenta_onvo_tb");
        assertThat(s).doesNotContainPattern("(?i)SET\\s+estado\\s*=");
    }

    @Test
    void aditivasEIdempotentes() throws Exception {
        for (String f : new String[] {"V244__alta_negocio_por_fases.sql", "V245__pago_destino_dinero_reintegro.sql"}) {
            String s = sql(f);
            for (String linea : s.split("\n")) {
                String l = linea.trim().toUpperCase();
                if (l.startsWith("ALTER TABLE") && l.contains("ADD COLUMN")) assertThat(l).as(f + ": " + linea).contains("IF NOT EXISTS");
                if (l.startsWith("CREATE INDEX") || l.startsWith("CREATE UNIQUE INDEX")) assertThat(l).as(f).contains("IF NOT EXISTS");
            }
            assertThat(s.toUpperCase()).doesNotContain("DROP ").doesNotContain("DELETE FROM");
        }
    }

    @Test
    void v245NoMarcaPagosHistoricos() throws Exception {
        String s = sql("V245__pago_destino_dinero_reintegro.sql");
        assertThat(s.toUpperCase()).doesNotContain("UPDATE ");
    }

    @Test
    void actualizadoSqlIncluyeLasMigraciones() throws Exception {
        String actualizado = Files.readString(Path.of("Actualizado.sql"));
        assertThat(actualizado).contains("alta_por_fases BOOLEAN NOT NULL DEFAULT FALSE")
            .contains("destino_dinero VARCHAR(12)");
    }
}
