package com.hotclick.service.suscripcion;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Locale;

/**
 * Pide REPEATABLE READ para la transacción EN CURSO con {@code SET TRANSACTION ISOLATION LEVEL REPEATABLE READ}
 * (alcance de la transacción, válido con PgBouncer en transaction mode) y lo verifica con
 * {@code SHOW transaction_isolation}. No usa {@code Connection.setTransactionIsolation}: pgjdbc lo traduce a
 * {@code SET SESSION CHARACTERISTICS}, que es de sesión. Tiene que ser la primera sentencia de la transacción.
 *
 * <p>Solo Postgres tiene snapshot que pedir: con otra base (H2 de los tests) no hace nada; el aislamiento real se
 * prueba contra Postgres (PlanesActivosSnapshotPostgresTest).
 */
@Component
public class SnapshotLecturaPg {

    static final String NIVEL = "repeatable read";

    @PersistenceContext
    private EntityManager em;

    @Transactional(propagation = Propagation.MANDATORY)
    public void exigirRepeatableRead() {
        em.unwrap(Session.class).doWork(con -> {
            if (!"PostgreSQL".equalsIgnoreCase(con.getMetaData().getDatabaseProductName())) return;
            try (Statement st = con.createStatement()) {
                st.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
                try (ResultSet rs = st.executeQuery("SHOW transaction_isolation")) {
                    String nivel = rs.next() ? rs.getString(1) : null;
                    if (nivel == null || !NIVEL.equals(nivel.toLowerCase(Locale.ROOT))) {
                        throw new IllegalStateException("La lectura de planes no quedó en REPEATABLE READ");
                    }
                }
            }
        });
    }
}
