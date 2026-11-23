package com.hotclick.migration;

import com.hotclick.model.PedidoEntrega;
import com.hotclick.model.PedidoRetiroToken;
import com.hotclick.model.TelegramCompradorSesion;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V243 pedidos del comprador por Telegram: aditiva, idempotente y alineada con las entidades")
class V243TelegramPedidoCompradorMigrationTest {

    private static final String RUTA = "src/main/resources/db/migration/V243__telegram_pedido_comprador.sql";

    @Test
    @DisplayName("se ejecuta dos veces sin error (IF NOT EXISTS) y no borra nada")
    void idempotente() throws Exception {
        String sql = Files.readString(Path.of(RUTA));
        assertThat(sql.toUpperCase()).doesNotContain("DROP ").doesNotContain("DELETE FROM").doesNotContain("TRUNCATE");
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:v241;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")) {
            c.createStatement().execute("CREATE TABLE hot_click_empresa_tb (id_empresa BIGINT PRIMARY KEY)");
            c.createStatement().execute("CREATE TABLE hot_click_pedido_tb (id_pedido BIGINT PRIMARY KEY)");
            for (int i = 0; i < 2; i++) c.createStatement().execute(sql);
            assertThat(columnas(c, "HOT_CLICK_TELEGRAM_COMPRADOR_SESION_TB")).containsExactlyInAnyOrderElementsOf(
                columnasDe(TelegramCompradorSesion.class));
            assertThat(columnas(c, "HOT_CLICK_PEDIDO_ENTREGA_TB")).containsExactlyInAnyOrderElementsOf(
                columnasDe(PedidoEntrega.class));
            assertThat(columnas(c, "HOT_CLICK_PEDIDO_RETIRO_TOKEN_TB")).containsExactlyInAnyOrderElementsOf(
                columnasDe(PedidoRetiroToken.class));
        }
    }

    @Test
    @DisplayName("Actualizado.sql lleva el mismo bloque V243")
    void actualizadoLoLleva() throws Exception {
        String a = Files.readString(Path.of("Actualizado.sql"));
        assertThat(a).contains("V243 (23-nov-2026)").contains("uq_pedido_retiro_token").contains("hot_click_pedido_entrega_tb");
    }

    private static Set<String> columnas(Connection c, String tabla) throws Exception {
        Set<String> out = new HashSet<>();
        try (ResultSet rs = c.getMetaData().getColumns(null, null, tabla, null)) {
            while (rs.next()) out.add(rs.getString("COLUMN_NAME").toLowerCase());
        }
        return out;
    }

    private static Set<String> columnasDe(Class<?> entidad) {
        assertThat(entidad.getAnnotation(Table.class)).isNotNull();
        Set<String> out = new HashSet<>();
        for (Field f : entidad.getDeclaredFields()) {
            Column col = f.getAnnotation(Column.class);
            JoinColumn join = f.getAnnotation(JoinColumn.class);
            if (col != null) out.add(col.name());
            else if (join != null) out.add(join.name());
        }
        return out;
    }
}
