package com.hotclick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Crea en H2 las tablas nativas que Flyway arma en Postgres y Hibernate no.
 * Sin esto, POST /api/auth/login responde 500 (join de permisos).
 */
@Component
@Profile("test")
@Order(1)
public class H2TablasNativasSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(H2TablasNativasSeeder.class);
    static final String SCRIPT = "db/h2/tablas-nativas-test.sql";

    private final DataSource dataSource;

    public H2TablasNativasSeeder(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(SCRIPT));
            kardexSeBorraConElProducto(connection);
        }
        LOG.info("H2: tablas nativas listas ({})", SCRIPT);
    }

    /**
     * Hibernate crea la FK del kardex sin ON DELETE CASCADE y el esquema de prod queda igual
     * (ddl-auto=none). En H2 el cleanup de los tests borra el producto: sin cascade, el movimiento
     * de la venta online pagada rompe ese delete.
     */
    private static void kardexSeBorraConElProducto(Connection connection) throws SQLException {
        String nombre = null;
        try (var ps = connection.prepareStatement(
            "SELECT tc.CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc "
                + "JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu "
                + "ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_NAME = kcu.TABLE_NAME "
                + "WHERE UPPER(tc.TABLE_NAME) = 'HOT_CLICK_MOVIMIENTO_STOCK_TB' "
                + "AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY' "
                + "AND UPPER(kcu.COLUMN_NAME) = 'FK_ID_PRODUCTO'")) {
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) nombre = rs.getString(1);
            }
        }
        if (nombre == null || !nombre.matches("[A-Za-z0-9_]+")) return;
        try (Statement st = connection.createStatement()) {
            st.execute("ALTER TABLE hot_click_movimiento_stock_tb DROP CONSTRAINT " + nombre);
            st.execute("ALTER TABLE hot_click_movimiento_stock_tb ADD CONSTRAINT fk_movimiento_producto "
                + "FOREIGN KEY (fk_id_producto) REFERENCES hot_click_producto_tb (id_producto) ON DELETE CASCADE");
        }
    }
}
