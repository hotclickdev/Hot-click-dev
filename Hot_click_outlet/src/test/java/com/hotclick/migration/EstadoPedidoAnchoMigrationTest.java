package com.hotclick.migration;

import com.hotclick.model.Pedido;
import com.hotclick.utils.Constants;
import jakarta.persistence.Column;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V146 amplía {@code estado_pedido}: todos los estados de pedido deben caber en la columna
 * de PostgreSQL y en la de la entidad (H2 en tests usa la longitud de {@code @Column}).
 */
@DisplayName("V146 — estado_pedido admite todos los estados de pedido")
class EstadoPedidoAnchoMigrationTest {

    private static final Path V146 =
        Path.of("src/main/resources/db/migration/V146__ampliar_estado_pedido.sql");
    private static final Pattern ALTER = Pattern.compile(
        "ALTER\\s+TABLE\\s+hot_click_pedido_tb\\s+ALTER\\s+COLUMN\\s+estado_pedido\\s+TYPE\\s+VARCHAR\\((\\d+)\\)",
        Pattern.CASE_INSENSITIVE);

    @Test
    @DisplayName("V146 amplía estado_pedido a VARCHAR(30) o más")
    void migracionAmpliaLaColumna() throws IOException {
        assertThat(anchoMigracion()).isGreaterThanOrEqualTo(30);
    }

    @Test
    @DisplayName("La entidad Pedido usa el mismo ancho que la migración")
    void entidadCoincideConMigracion() throws Exception {
        assertThat(anchoEntidad()).isEqualTo(anchoMigracion());
    }

    @Test
    @DisplayName("Ningún Constants.PEDIDO_* excede el ancho de la columna (incluye PENDIENTE_COMPROBANTE)")
    void todosLosEstadosCaben() throws Exception {
        int ancho = anchoEntidad();
        List<String> estados = estadosPedido();

        assertThat(estados).contains(Constants.PEDIDO_PENDIENTE_COMPROBANTE, Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estados).allSatisfy(e -> assertThat(e.length()).as(e).isLessThanOrEqualTo(ancho));
    }

    private static int anchoMigracion() throws IOException {
        Matcher m = ALTER.matcher(Files.readString(V146));
        assertThat(m.find()).as("ALTER COLUMN estado_pedido TYPE VARCHAR(n) en V146").isTrue();
        return Integer.parseInt(m.group(1));
    }

    private static int anchoEntidad() throws NoSuchFieldException {
        Column col = Pedido.class.getDeclaredField("estadoPedido").getAnnotation(Column.class);
        assertThat(col).isNotNull();
        return col.length();
    }

    private static List<String> estadosPedido() throws IllegalAccessException {
        List<String> estados = new ArrayList<>();
        for (Field f : Constants.class.getDeclaredFields()) {
            int mod = f.getModifiers();
            if (f.getName().startsWith("PEDIDO_") && f.getType() == String.class
                    && Modifier.isStatic(mod) && Modifier.isPublic(mod)) {
                estados.add((String) f.get(null));
            }
        }
        return estados;
    }
}
