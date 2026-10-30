package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regresión: en una instancia dev limpia (BD migrada pero vacía, usuario sin superusuario) el reset
 * tiraba 'transaction is aborted'. Postgres deja la transacción abortada ante cualquier error aunque
 * Java lo atrape, y todo lo siguiente falla con 25P02. El JdbcTemplate falso de abajo reproduce esa
 * semántica (incluido ROLLBACK TO SAVEPOINT), así que corre igual en CI con H2.
 */
@DisplayName("Reset plataforma QA: BD vacía sin abortar la transacción")
class ResetPlataformaKeepQaBdVaciaTest {

    /** JdbcTemplate que se porta como Postgres dentro de una transacción. */
    static final class PostgresFalso extends JdbcTemplate {
        final Set<String> tablasFaltantes;
        final String sentenciaConErrorReal;
        boolean abortada;
        final List<String> abortadas25P02 = new ArrayList<>();

        PostgresFalso(Set<String> tablasFaltantes, String sentenciaConErrorReal) {
            this.tablasFaltantes = tablasFaltantes;
            this.sentenciaConErrorReal = sentenciaConErrorReal;
        }

        private void correr(String sql) {
            if (abortada) {
                abortadas25P02.add(sql);
                throw error(sql, "current transaction is aborted, commands ignored until end of transaction block", "25P02");
            }
            if (sql.contains("session_replication_role")) {
                abortada = true;
                throw error(sql, "permission denied to set parameter \"session_replication_role\"", "42501");
            }
            for (String t : tablasFaltantes) {
                if (sql.contains(t)) {
                    abortada = true;
                    throw error(sql, "relation \"" + t + "\" does not exist", "42P01");
                }
            }
            if (sentenciaConErrorReal != null && sql.trim().equals(sentenciaConErrorReal)) {
                abortada = true;
                throw error(sql, "violates foreign key constraint", "23503");
            }
        }

        private static DataAccessException error(String sql, String msg, String state) {
            return new UncategorizedSQLException("pg", sql, new SQLException(msg, state));
        }

        @Override public void execute(String sql) { correr(sql); }
        @Override public int update(String sql, Object... args) { correr(sql); return 1; }
        @Override public <T> List<T> query(String sql, RowMapper<T> rm, Object... args) { correr(sql); return List.of(); }
        @Override public <T> T queryForObject(String sql, Class<T> type) {
            correr(sql);
            return type.cast(0L);
        }

        @Override
        public <T> T execute(ConnectionCallback<T> action) {
            try {
                Connection con = mock(Connection.class);
                when(con.getAutoCommit()).thenReturn(false);
                when(con.setSavepoint()).thenAnswer(inv -> {
                    if (abortada) {
                        throw new SQLException("current transaction is aborted", "25P02");
                    }
                    return mock(Savepoint.class);
                });
                doAnswer(inv -> { abortada = false; return null; }).when(con).rollback(any(Savepoint.class));
                return action.doInConnection(con);
            } catch (SQLException e) {
                throw new UncategorizedSQLException("pg", "callback", e);
            }
        }
    }

    @Test
    @DisplayName("BD vacía, sin permiso para session_replication_role y tablas opcionales ausentes: termina sin 25P02")
    void bdVaciaNoAbortaLaTransaccion() {
        PostgresFalso pg = new PostgresFalso(
            Set.of("hot_click_wa_log_tb", "hot_click_webauthn_credential_tb"), null);
        ResetPlataformaKeepQaService service = new ResetPlataformaKeepQaService(pg);

        Map<String, Object> resultado = service.ejecutarSiPendiente();

        assertThat(pg.abortadas25P02).isEmpty();
        assertThat(pg.abortada).isFalse();
        assertThat(resultado).containsEntry("omitido", false).containsEntry("productos", 0L);
    }

    @Test
    @DisplayName("Un error real (FK al borrar productos) se propaga con su SQLState, no se traga ni se disfraza de 25P02")
    void errorRealSePropaga() {
        PostgresFalso pg = new PostgresFalso(Set.of(), "DELETE FROM hot_click_producto_tb");
        ResetPlataformaKeepQaService service = new ResetPlataformaKeepQaService(pg);

        assertThatThrownBy(service::ejecutar)
            .isInstanceOf(DataAccessException.class)
            .satisfies(e -> assertThat(((SQLException) e.getCause()).getSQLState()).isEqualTo("23503"));
    }
}
