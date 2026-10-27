package com.hotclick.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * M1/M4 sin PostgreSQL (la suite corre en H2): en PostgreSQL el limitador usa UN solo INSERT … ON CONFLICT … RETURNING
 * (sin SELECT previo ni INSERT que pueda chocar y abortar la transacción del llamador), y los logs no llevan la llave
 * (que incluye la IP). La carrera real contra PostgreSQL está en {@link RateLimiterPostgresTest}.
 */
@DisplayName("[RateLimiter] PostgreSQL: upsert atómico; logs sin la llave")
class RateLimiterPostgresSqlTest {

    @Test
    @DisplayName("En PostgreSQL cuenta con un único INSERT … ON CONFLICT DO UPDATE y no hace SELECT ni INSERT sueltos")
    @SuppressWarnings("unchecked")
    void upsertAtomicoEnPostgres() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.execute(any(ConnectionCallback.class))).thenReturn("PostgreSQL");
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(7);

        assertThat(new RateLimiter(jdbc).registrar("auth:fallos:usuario:1:global", 1800)).isEqualTo(7);

        org.mockito.ArgumentCaptor<String> sql = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(Integer.class), any(Object[].class));
        assertThat(sql.getValue()).contains("ON CONFLICT (bucket_key) DO UPDATE").contains("RETURNING count");
        verify(jdbc, never()).queryForList(anyString(), eq(Long.class), any(Object[].class));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    @DisplayName("M4: un error de BD no escribe la llave (con la IP) en el log")
    void logsSinLlave() {
        Logger logger = (Logger) LoggerFactory.getLogger(RateLimiter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        Level antes = logger.getLevel();
        logger.setLevel(Level.DEBUG);
        try {
            JdbcTemplate roto = mock(JdbcTemplate.class, invocation -> { throw new org.springframework.dao.DataAccessResourceFailureException("caida"); });
            RateLimiter rl = new RateLimiter(roto);
            String llave = "auth:fallos:usuario:5:ip:203.0.113.77";
            rl.registrar(llave, 60);
            rl.alcanzoLimite(llave, 5, 60);
            rl.liberar(llave);
            assertThat(rl.tryAcquireEstricto(llave, 5, 60)).isFalse();
            rl.tryAcquire(llave, 5, 60);

            assertThat(appender.list).isNotEmpty();
            assertThat(appender.list).allSatisfy(e -> assertThat(e.getFormattedMessage())
                .doesNotContain("203.0.113.77").doesNotContain("auth:fallos"));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(antes);
        }
    }

    private static java.util.List<String> mensajesDeArranque(JdbcTemplate jdbc) {
        Logger logger = (Logger) LoggerFactory.getLogger(RateLimiter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        Level antes = logger.getLevel();
        logger.setLevel(Level.INFO);
        try {
            new RateLimiter(jdbc).logDialecto();
            return appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(antes);
        }
    }

    @Test
    @DisplayName("L3: al arrancar deja en el log que eligió la rama PostgreSQL (sin llaves ni datos personales)")
    @SuppressWarnings("unchecked")
    void logDeArranquePostgres() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.execute(any(ConnectionCallback.class))).thenReturn("PostgreSQL");
        assertThat(mensajesDeArranque(jdbc)).singleElement().satisfies(m ->
            assertThat(m).contains("[RATE-LIMIT]").contains("PostgreSQL").contains("ON CONFLICT").doesNotContain("auth:"));
    }

    @Test
    @DisplayName("L3: con otro motor (H2) el log avisa que usa la rama genérica no atómica")
    @SuppressWarnings("unchecked")
    void logDeArranqueGenerico() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.execute(any(ConnectionCallback.class))).thenReturn("H2");
        assertThat(mensajesDeArranque(jdbc)).singleElement().satisfies(m ->
            assertThat(m).contains("[RATE-LIMIT]").contains("genérico").doesNotContain("ON CONFLICT"));
    }

    @Test
    @DisplayName("L3: si la BD no responde al arrancar avisa sin la excepción ni datos y no tumba el arranque")
    void logDeArranqueSinBd() {
        JdbcTemplate roto = mock(JdbcTemplate.class, invocation -> { throw new org.springframework.dao.DataAccessResourceFailureException("jdbc:postgresql://host/secreto"); });
        assertThat(mensajesDeArranque(roto)).singleElement().satisfies(m ->
            assertThat(m).contains("[RATE-LIMIT]").doesNotContain("secreto").doesNotContain("jdbc:"));
    }
}
