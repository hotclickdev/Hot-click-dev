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

    /** Reserva n intentos (cada uno consume cupo, como en el controller antes de abrir el .p12). */
    private void fallos(int n) {
        for (int i = 0; i < n; i++) limiter.reservarIntento(1L, 2L, "203.0.113.5");
    }

    @Test
    @DisplayName("Los intentos 1..5 pasan (0); el 6.º se niega y bloquea 15 min")
    void sextoSeNiega() {
        for (int i = 1; i <= 5; i++) assertThat(limiter.reservarIntento(1L, 2L, "203.0.113.5")).as("intento %d", i).isZero();
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isZero();
        assertThat(limiter.reservarIntento(1L, 2L, "203.0.113.5")).isBetween(890L, 900L);
        assertThat(limiter.reservarIntento(1L, 2L, "203.0.113.5")).isBetween(890L, 900L); // sigue negado
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isBetween(890L, 900L);
    }

    @Test
    @DisplayName("Pedidos negados repetidos NO inflan la reincidencia (un solo strike por bloqueo)")
    void negadosNoInflanEscalada() {
        fallos(5);
        for (int i = 0; i < 30; i++) limiter.reservarIntento(1L, 2L, "203.0.113.5");
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isBetween(890L, 900L);
    }

    @Test
    @DisplayName("Cualquier eje basta: misma empresa con otro usuario e IP queda bloqueada")
    void cualquierEje() {
        fallos(6);
        assertThat(limiter.segundosBloqueado(1L, 99L, "198.51.100.1")).isPositive(); // eje empresa
        assertThat(limiter.segundosBloqueado(7L, 2L, "198.51.100.1")).isPositive();  // eje usuario
        assertThat(limiter.segundosBloqueado(7L, 99L, "203.0.113.5")).isPositive();  // eje IP
        assertThat(limiter.segundosBloqueado(7L, 99L, "198.51.100.1")).isZero();
    }

    @Test
    @DisplayName("Bloqueo creciente: 15, 30 y 60 min en reincidencias; tope de 24 h")
    void bloqueoCreciente() {
        fallos(6);
        long b1 = limiter.segundosBloqueado(1L, 2L, "203.0.113.5");
        jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:lock:%' OR bucket_key LIKE 'pincert:fail:%'");
        fallos(6);
        long b2 = limiter.segundosBloqueado(1L, 2L, "203.0.113.5");
        jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:lock:%' OR bucket_key LIKE 'pincert:fail:%'");
        fallos(6);
        long b3 = limiter.segundosBloqueado(1L, 2L, "203.0.113.5");
        assertThat(b1).isBetween(890L, 900L);
        assertThat(b2).isBetween(1790L, 1800L);
        assertThat(b3).isBetween(3590L, 3600L);
        for (int i = 0; i < 10; i++) {
            jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:lock:%' OR bucket_key LIKE 'pincert:fail:%'");
            fallos(6);
        }
        assertThat(limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isLessThanOrEqualTo(86_400L);
    }

    @Test
    @DisplayName("Un PIN correcto libera los fallos acumulados")
    void exitoLibera() {
        fallos(4);
        limiter.liberarReserva(1L, 2L, "203.0.113.5");
        for (int i = 0; i < 5; i++) assertThat(limiter.reservarIntento(1L, 2L, "203.0.113.5")).isZero();
    }

    @Test
    @DisplayName("Fail-closed: sin tabla/BD, comprobar y contar lanzan (no se permite el intento)")
    void failClosed() {
        jdbc.execute("DROP TABLE hot_click_rate_limit_tb");
        assertThatThrownBy(() -> limiter.segundosBloqueado(1L, 2L, "203.0.113.5")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> limiter.reservarIntento(1L, 2L, "203.0.113.5")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> limiter.liberarReserva(1L, 2L, "203.0.113.5")).isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("Si la liberación estricta falla, lanza y el cupo queda consumido (no se abre brecha)")
    void liberarFallidoDejaCupoConsumido() {
        fallos(5);
        jdbc.execute("ALTER TABLE hot_click_rate_limit_tb RENAME TO hot_click_rate_limit_tb_x");
        assertThatThrownBy(() -> limiter.liberarReserva(1L, 2L, "203.0.113.5")).isInstanceOf(RuntimeException.class);
        jdbc.execute("ALTER TABLE hot_click_rate_limit_tb_x RENAME TO hot_click_rate_limit_tb");
        assertThat(limiter.reservarIntento(1L, 2L, "203.0.113.5")).isPositive(); // el 6.º sigue negado
    }
}
