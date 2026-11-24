package com.hotclick.migration;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionSesion;
import jakarta.persistence.Column;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V245/V246 agente: aditivas, idempotentes, copiadas a Actualizado.sql y alineadas con las entidades")
class V245V246AgenteMigrationTest {

    private static final String V245 = "src/main/resources/db/migration/V245__canal_cuenta.sql";
    private static final String V246 = "src/main/resources/db/migration/V246__chat_sesion_agente.sql";

    @Test
    void sinSentenciasDestructivasYConGuardasDeIdempotencia() throws Exception {
        for (String ruta : new String[]{V245, V246}) {
            String sql = Files.readString(Path.of(ruta)).toUpperCase();
            assertThat(sql).doesNotContain("DROP TABLE").doesNotContain("DROP COLUMN")
                .doesNotContain("DELETE FROM").doesNotContain("TRUNCATE").doesNotContain("UPDATE ");
        }
        assertThat(Files.readString(Path.of(V245))).contains("CREATE TABLE IF NOT EXISTS hot_click_canal_cuenta_tb");
        String v246 = Files.readString(Path.of(V246));
        assertThat(v246.split("ADD COLUMN", -1).length - 1).isEqualTo(v246.split("ADD COLUMN IF NOT EXISTS", -1).length - 1);
        // cada ADD CONSTRAINT va precedido de su DROP CONSTRAINT IF EXISTS
        assertThat(v246).contains("DROP CONSTRAINT IF EXISTS chk_chat_sesion_canal")
            .contains("DROP CONSTRAINT IF EXISTS chk_chat_msg_rol");
    }

    @Test
    void elMismoSqlEstaAlFinalDeActualizadoSql() throws Exception {
        String actualizado = Files.readString(Path.of("Actualizado.sql"));
        for (String ruta : new String[]{V245, V246}) {
            String cuerpo = String.join("\n", Files.readAllLines(Path.of(ruta)).stream()
                .filter(l -> !l.startsWith("--")).toList());
            assertThat(actualizado).contains(cuerpo.trim().lines().findFirst().orElseThrow());
        }
        assertThat(actualizado).contains("uq_chat_sesion_cuenta_contacto_abierta").contains("uq_canal_cuenta_tipo_externo");
    }

    @Test
    void columnasDeLasEntidadesExistenEnLasMigraciones() throws Exception {
        String sql = Files.readString(Path.of(V245)) + Files.readString(Path.of(V246))
            + Files.readString(Path.of("src/main/resources/db/migration/V63__chat_sesion_asistente.sql"));
        for (Class<?> c : new Class<?>[]{CanalCuenta.class, ConversacionSesion.class, ConversacionMensaje.class}) {
            for (Field f : c.getDeclaredFields()) {
                Column col = f.getAnnotation(Column.class);
                if (col != null) assertThat(sql).as(c.getSimpleName() + "." + col.name()).contains(col.name());
            }
        }
    }
}
