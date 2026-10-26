package com.hotclick.repository;

import com.hotclick.config.PerfilesSeguros;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;

/**
 * Implementación del fragmento (Spring Data la enlaza por el sufijo Impl). Usa JdbcTemplate sobre el mismo
 * DataSource, así participa de la transacción JPA en curso.
 *
 * <p>Fail-closed: el camino no-PostgreSQL solo se permite si la BD es H2 Y el perfil
 * {@link PerfilesSeguros#TEST_ESTRICTO} está activo. Cualquier otra combinación lanza IllegalStateException.
 *
 * <p>PostgreSQL (producción): {@link #SQL_RESERVA_PG}. Otras BDs (solo H2 de la suite, que no ejecuta
 * ON CONFLICT): INSERT plano y la PK duplicada se traduce a 0. H2 no aborta la transacción por un error de
 * sentencia, y DuplicateKeyException de JdbcTemplate no marca la transacción JPA como rollback-only.
 */
public class StripeEventoReservaImpl implements StripeEventoReserva {

    private static final String SQL_INSERT = """
        INSERT INTO hot_click_stripe_evento_tb (stripe_event_id, tipo, procesado_ok, fecha_recibido, fecha_procesado)
        VALUES (?, ?, TRUE, ?, ?)
        """;

    private final JdbcTemplate jdbc;
    private final Environment env;
    private volatile Boolean postgres;

    public StripeEventoReservaImpl(JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @Override
    public int reservar(String id, String tipo, LocalDateTime ahora) {
        Timestamp t = Timestamp.valueOf(ahora);
        if (esPostgres()) return jdbc.update(SQL_RESERVA_PG, id, tipo, t, t);
        try {
            return jdbc.update(SQL_INSERT, id, tipo, t, t);
        } catch (DuplicateKeyException yaExiste) {
            return 0;
        }
    }

    private boolean esPostgres() {
        Boolean p = postgres;
        if (p == null) {
            String producto = jdbc.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName());
            p = decidirRuta(producto, env);
            postgres = p;
        }
        return p;
    }

    /** true = PostgreSQL; false = H2 bajo test estricto; cualquier otro caso: IllegalStateException. */
    static boolean decidirRuta(String producto, Environment env) {
        if ("PostgreSQL".equalsIgnoreCase(producto)) return true;
        boolean testEstricto = env != null && env.acceptsProfiles(Profiles.of(PerfilesSeguros.TEST_ESTRICTO));
        if ("H2".equalsIgnoreCase(producto) && testEstricto) return false;
        throw new IllegalStateException(
            "Reserva de eventos: BD no soportada fuera de H2+perfil test estricto (producto=" + producto + ")");
    }
}
