package com.hotclick.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("PinCertIntentosLimiter — tope 5/15 min, bloqueo creciente y fail-closed")
class PinCertIntentosLimiterTest {

    private JdbcTemplate jdbc;
    private PinCertIntentosLimiter limiter;

    @BeforeEach
    void preparar() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
            "jdbc:h2:mem:pinlim" + System.nanoTime() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("CREATE TABLE hot_click_rate_limit_tb (bucket_key VARCHAR(255) PRIMARY KEY, count INT NOT NULL, "
            + "window_start BIGINT NOT NULL, expires_at BIGINT NOT NULL)");
        limiter = new PinCertIntentosLimiter(new RateLimiter(jdbc));
    }

    private void fallos(int n) {
        for (int i = 0; i < n; i++) limiter.registrarFallo(1L, 2L, "203.0.113.5");
    }

    @Test
    @DisplayName("4 fallos no bloquean; el 5.º bloquea 15 min")
    void quintoFalloBloquea() {
        fallos(4);
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isZero();
        fallos(1);
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isBetween(890L, 900L);
    }

    @Test
    @DisplayName("Cualquier eje basta: misma empresa con otro usuario e IP queda bloqueada")
    void cualquierEje() {
        fallos(5);
        assertThat(limiter.segundosBloqueado(1L, 99L, "198.51.100.1")).isPositive(); // eje empresa
        assertThat(limiter.segundosBloqueado(7L, 2L, "198.51.100.1")).isPositive();  // eje usuario
        assertThat(limiter.segundosBloqueado(7L, 99L, "203.0.113.5")).isPositive();  // eje IP
        assertThat(limiter.segundosBloqueado(7L, 99L, "198.51.100.1")).isZero();
    }

    @Test
    @DisplayName("Bloqueo creciente: 15, 30 y 60 min en reincidencias; tope de 24 h")
    void bloqueoCreciente() {
        fallos(5);
        long b1 = limiter.segundosBloqueado(1L, 2L, "203.0.113.5");
        jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:lock:%'");
        fallos(5);
        long b2 = limiter.segundosBloqueado(1L, 2L, "203.0.113.5");
        jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:lock:%'");
        fallos(5);
        long b3 = limiter.segundosBloqueado(1L, 2L, "203.0.113.5");
        assertThat(b1).isBetween(890L, 900L);
        assertThat(b2).isBetween(1790L, 1800L);
        assertThat(b3).isBetween(3590L, 3600L);
        for (int i = 0; i < 10; i++) {
            jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:lock:%'");
            fallos(5);
        }
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isLessThanOrEqualTo(86_400L);
    }

    @Test
    @DisplayName("Un PIN correcto libera los fallos acumulados")
    void exitoLibera() {
        fallos(4);
        limiter.registrarExito(1L, 2L, "203.0.113.5");
        fallos(4);
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isZero();
    }

    @Test
    @DisplayName("Fail-closed: sin tabla/BD, comprobar y contar lanzan (no se permite el intento)")
    void failClosed() {
        jdbc.execute("DROP TABLE hot_click_rate_limit_tb");
        assertThatThrownBy(() -> limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> limiter.registrarFallo(1L, 2L, "203.0.113.5")).isInstanceOf(RuntimeException.class);
    }
}
