package com.hotclick.integration;

import com.hotclick.scheduler.WalletReconciliacionSchedulerTestAccess;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import org.hibernate.dialect.PostgreSQLDialect;
import org.hibernate.exception.ConstraintViolationException;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * PostgreSQL real con los índices de V81 y V166 (DDL copiado literalmente de V81__wallet_seguridad.sql
 * y V166__wallet_tx_unico_por_referencia.sql):
 * duplicado de CREDITO_VENTA → esCreditoDuplicado=true (PROCESADO); FK u otra violación → false (reintento).
 * Se omite automáticamente si no hay Docker (disabledWithoutDocker).
 */
@Testcontainers(disabledWithoutDocker = true)
class WalletCreditoDuplicadoPostgresTest {

    @Container
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16-alpine");

    static JdbcTemplate jdbc;

    @BeforeAll
    static void esquema() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword()));
        jdbc.execute("CREATE TABLE empresa (id BIGINT PRIMARY KEY)");
        jdbc.execute("""
            CREATE TABLE hot_click_wallet_transaccion_tb (
              id BIGSERIAL PRIMARY KEY,
              empresa_id BIGINT NOT NULL REFERENCES empresa(id),
              tipo VARCHAR(30) NOT NULL,
              referencia_tipo VARCHAR(30),
              referencia_id BIGINT)""");
        jdbc.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_credito_por_pedido
                ON hot_click_wallet_transaccion_tb (referencia_id)
                WHERE referencia_tipo = 'PEDIDO' AND tipo = 'CREDITO_VENTA'""");
        jdbc.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_referencia_tipo
                ON hot_click_wallet_transaccion_tb (referencia_tipo, referencia_id, tipo)
                WHERE referencia_id IS NOT NULL""");
        jdbc.update("INSERT INTO empresa VALUES (1)");
    }

    private Throwable insertar(long empresa, Long pedido) {
        return insertar(empresa, "CREDITO_VENTA", "PEDIDO", pedido);
    }

    private Throwable insertar(long empresa, String tipo, String refTipo, Long ref) {
        try {
            jdbc.update("INSERT INTO hot_click_wallet_transaccion_tb (empresa_id, tipo, referencia_tipo, referencia_id) "
                + "VALUES (?, ?, ?, ?)", empresa, tipo, refTipo, ref);
            return null;
        } catch (DataIntegrityViolationException e) {
            // Reproduce la traducción de Hibernate (JPA saveAndFlush) sobre el error real de PostgreSQL.
            SQLException sqle = (SQLException) e.getCause();
            String nombre = new PostgreSQLDialect().getViolatedConstraintNameExtractor().extractConstraintName(sqle);
            return new DataIntegrityViolationException(e.getMessage(),
                new ConstraintViolationException(e.getMessage(), sqle, nombre));
        }
    }

    @Test
    void duplicadoDelIndiceV81EsCreditoDuplicado() {
        assertNull(insertar(1, 500L));
        Throwable dup = insertar(1, 500L);
        assertNotNull(dup);
        assertTrue(WalletReconciliacionSchedulerTestAccess.esCreditoDuplicado(dup));
    }

    @Test
    void duplicadoDelIndiceV166EsCreditoDuplicado() {
        // Solo V166 aplica (no es CREDITO_VENTA/PEDIDO): el nombre real reportado por PostgreSQL es el de V166.
        assertNull(insertar(1, "LIBERACION_PAYOUT", "SOLICITUD_PAYOUT", 700L));
        Throwable dup = insertar(1, "LIBERACION_PAYOUT", "SOLICITUD_PAYOUT", 700L);
        assertNotNull(dup);
        assertEquals("uq_wallet_tx_referencia_tipo",
            ((ConstraintViolationException) dup.getCause()).getConstraintName());
        assertTrue(WalletReconciliacionSchedulerTestAccess.esCreditoDuplicado(dup));
    }

    @Test
    void violacionDeFkSigueReintento() {
        Throwable fk = insertar(999, 501L);
        assertNotNull(fk);
        assertEquals("23503", ((ConstraintViolationException) fk.getCause()).getSQLState());
        assertFalse(WalletReconciliacionSchedulerTestAccess.esCreditoDuplicado(fk));
    }

    @Test
    void pedidoNuloNoLoCubreElIndice() {
        // Documenta el hueco: dos créditos con referencia_id NULL entran sin error → por eso el scheduler
        // manda esos ítems a AGOTADO sin acreditar.
        assertNull(insertar(1, null));
        assertNull(insertar(1, null));
    }
}
