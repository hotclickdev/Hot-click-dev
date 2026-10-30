package com.hotclick.service.suscripcion;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.hibernate.Session;
import org.hibernate.jdbc.ReturningWork;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("lock_timeout de la transacción por fila (reconsulta ONVO)")
class LockTimeoutPorFilaTest {

    private static EntityManager emConBase(String producto, Query query) {
        EntityManager em = mock(EntityManager.class);
        Session session = mock(Session.class);
        when(em.unwrap(Session.class)).thenReturn(session);
        when(session.doReturningWork(org.mockito.ArgumentMatchers.<ReturningWork<String>>any())).thenReturn(producto);
        when(em.createNativeQuery(anyString())).thenReturn(query);
        return em;
    }

    private static OnvoReconsultaConfig config(int lockMs) {
        return new OnvoReconsultaConfig(8, 7, 5, lockMs);
    }

    @Test
    @DisplayName("PostgreSQL: SET LOCAL lock_timeout con el valor de la configuración")
    void postgresAplicaSetLocal() {
        Query q = mock(Query.class);
        EntityManager em = emConBase("PostgreSQL", q);

        new LockTimeoutPorFila(em, config(4321)).aplicar();

        verify(em).createNativeQuery("SET LOCAL lock_timeout = 4321");
        verify(q).executeUpdate();
    }

    @Test
    @DisplayName("Otra base (H2 en tests): no ejecuta nada")
    void otraBaseNoHaceNada() {
        Query q = mock(Query.class);
        EntityManager em = emConBase("H2", q);

        new LockTimeoutPorFila(em, config(4321)).aplicar();

        verify(em, never()).createNativeQuery(anyString());
    }

    @Test
    @DisplayName("lock-timeout-ms=0 lo desactiva")
    void ceroLoDesactiva() {
        EntityManager em = emConBase("PostgreSQL", mock(Query.class));

        new LockTimeoutPorFila(em, config(0)).aplicar();

        verify(em, never()).createNativeQuery(anyString());
    }
}
