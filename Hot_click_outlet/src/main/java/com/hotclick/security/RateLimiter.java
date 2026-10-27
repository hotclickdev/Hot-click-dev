package com.hotclick.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Distributed rate limiter backed by hot_click_rate_limit_tb.
 * Safe for multi-pod deployments — all pods share the same DB counter.
 *
 * Fail-open: if DB is unavailable, request is allowed (availability > rate limiting).
 * Cleanup: RateLimitLimpiezaScheduler (cada 15 min, por lotes) y, de respaldo, DataRetentionScheduler (nocturno).
 *
 * Typical usage:
 *   rateLimiter.tryAcquire("empresa:42:ai:burst", 10, 300)
 *   rateLimiter.tryAcquire("ip:1.2.3.4:/api/login", 10, 60)
 */
@Service
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private final JdbcTemplate jdbc;

    public RateLimiter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // PostgreSQL (producción): UN solo INSERT … ON CONFLICT DO UPDATE … RETURNING, atómico. Antes, la carrera
    // SELECT→INSERT terminaba en un INSERT duplicado que, dentro de una transacción del llamador (p. ej.
    // UsuarioService.registrarFalloAutenticacion), la abortaba en PostgreSQL ("current transaction is aborted"):
    // un 500 solo para correos que existen y el fallo sin contar.
    // H2 (suite de tests) no soporta ON CONFLICT … DO UPDATE ni RETURNING: ahí queda la lectura + insert-o-update
    // explícito de abajo (en H2 un INSERT duplicado no aborta la transacción).
    private static final String UPSERT_PG_SQL =
        "INSERT INTO hot_click_rate_limit_tb AS t (bucket_key, count, window_start, expires_at) VALUES (?, 1, ?, ?) "
        + "ON CONFLICT (bucket_key) DO UPDATE SET "
        + "count = CASE WHEN t.window_start + ? <= ? THEN 1 ELSE t.count + 1 END, "
        + "window_start = CASE WHEN t.window_start + ? <= ? THEN ? ELSE t.window_start END, "
        + "expires_at = ? "
        + "RETURNING count";

    private volatile Boolean postgres;

    /**
     * Deja en el log de arranque qué rama eligió el limitador (upsert atómico de PostgreSQL o la genérica): si en
     * producción dijera "genérica", el arreglo de la carrera (M1) no estaría activo. Sin datos personales.
     * Si la BD no responde al arrancar no se cachea nada y se vuelve a detectar en el primer uso.
     */
    @jakarta.annotation.PostConstruct
    public void logDialecto() {
        try {
            log.info("[RATE-LIMIT] dialecto de conteo: {}", esPostgres()
                ? "PostgreSQL (INSERT … ON CONFLICT DO UPDATE atómico)"
                : "genérico (SELECT + INSERT/UPDATE, no atómico: solo H2/tests)");
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] no se pudo detectar el dialecto al arrancar ({}); se detecta en el primer uso",
                e.getClass().getName());
        }
    }

    private boolean esPostgres() {
        Boolean p = postgres;
        if (p == null) {
            String producto = jdbc.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName());
            p = producto != null && producto.toLowerCase(java.util.Locale.ROOT).contains("postgres");
            postgres = p;
        }
        return p;
    }
    private static final String SELECT_WINDOW_SQL =
        "SELECT window_start FROM hot_click_rate_limit_tb WHERE bucket_key = ?";

    private static final String INSERT_SQL =
        "INSERT INTO hot_click_rate_limit_tb (bucket_key, count, window_start, expires_at) VALUES (?, 1, ?, ?)";

    private static final String RESET_WINDOW_SQL =
        "UPDATE hot_click_rate_limit_tb SET count = 1, window_start = ?, expires_at = ? WHERE bucket_key = ?";

    private static final String INCREMENT_SQL =
        "UPDATE hot_click_rate_limit_tb SET count = count + 1, expires_at = ? WHERE bucket_key = ?";

    private static final String COUNT_SQL =
        "SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = ?";

    /**
     * Returns true if this request is within the limit (allowed).
     * Returns false if the limit is exceeded (block it).
     *
     * @param key           Unique bucket key, e.g. "ip:1.2.3.4:/api/login"
     * @param maxRequests   Maximum number of requests allowed in the window
     * @param windowSeconds Length of the time window in seconds
     */
    public boolean tryAcquire(String key, int maxRequests, int windowSeconds) {
        long now     = Instant.now().getEpochSecond();
        long expires = now + windowSeconds;
        try {
            int count = incrementarYContar(key, now, expires, windowSeconds);
            return count <= maxRequests;
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable, fail-open: {}", e.getClass().getName());
            return true;
        }
    }

    /**
     * Igual que {@link #tryAcquire} pero FAIL-CLOSED: ante cualquier error de BD devuelve
     * false. Para topes de costo, donde negar (y degradar) es preferible a dejar pasar.
     */
    public boolean tryAcquireEstricto(String key, int maxRequests, int windowSeconds) {
        long now     = Instant.now().getEpochSecond();
        long expires = now + windowSeconds;
        try {
            int count = incrementarYContar(key, now, expires, windowSeconds);
            return count <= maxRequests;
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable, fail-closed: {}", e.getClass().getName());
            return false;
        }
    }

    /**
     * Cuenta un evento en el bucket SIN decidir nada: devuelve el contador de la ventana (1 si es el primero)
     * o 0 si la BD no responde (fail-open: contar fallos nunca debe tumbar el login).
     */
    public int registrar(String key, int windowSeconds) {
        long now = Instant.now().getEpochSecond();
        try {
            return incrementarYContar(key, now, now + windowSeconds, windowSeconds);
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable al registrar: {}", e.getClass().getName());
            return 0;
        }
    }

    /**
     * Lectura sin incrementar: true si el bucket tiene {@code max} o más eventos dentro de su ventana vigente.
     * Fail-open (BD caída → false): el bloqueo por fallos es una defensa adicional, no la única.
     */
    public boolean alcanzoLimite(String key, int max, int windowSeconds) {
        long now = Instant.now().getEpochSecond();
        try {
            var filas = jdbc.queryForList(
                "SELECT window_start, count FROM hot_click_rate_limit_tb WHERE bucket_key = ?", key);
            if (filas.isEmpty()) return false;
            long inicio = ((Number) filas.get(0).get("window_start")).longValue();
            int  cuenta = ((Number) filas.get(0).get("count")).intValue();
            return inicio + windowSeconds > now && cuenta >= max;
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable al leer: {}", e.getClass().getName());
            return false;
        }
    }

    /** Borra el bucket (p. ej. al autenticarse bien, para que los tropiezos viejos no cuenten). */
    public void liberar(String key) {
        try {
            jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key = ?", key);
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable al liberar: {}", e.getClass().getName());
        }
    }

    /** Borra todos los buckets cuya llave empieza con {@code prefijo} (p. ej. los de IP de un usuario al desbloquearlo). */
    public void liberarPrefijo(String prefijo) {
        try {
            String patron = prefijo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE bucket_key LIKE ? ESCAPE '\\'", patron);
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] DB unavailable al liberar por prefijo: {}", e.getClass().getName());
        }
    }

    /**
     * Borra los buckets vencidos en lotes (clave a clave no: un {@code DELETE} por lote con tope de lotes por
     * corrida, para no tomar un lock grande en la tabla). Devuelve cuántos borró.
     */
    public int limpiarExpirados(int lote, int maxLotes) {
        long now = Instant.now().getEpochSecond();
        int total = 0;
        for (int i = 0; i < maxLotes; i++) {
            int n = jdbc.update(
                "DELETE FROM hot_click_rate_limit_tb WHERE bucket_key IN ("
                + "SELECT bucket_key FROM hot_click_rate_limit_tb WHERE expires_at < ? LIMIT " + lote + ")", now);
            total += n;
            if (n < lote) break;
        }
        return total;
    }

    private int incrementarYContar(String key, long now, long expires, int windowSeconds) {
        if (esPostgres()) {
            Integer n = jdbc.queryForObject(UPSERT_PG_SQL, Integer.class,
                key, now, expires, windowSeconds, now, windowSeconds, now, now, expires);
            return n == null ? 1 : n;
        }
        java.util.List<Long> existing = jdbc.queryForList(SELECT_WINDOW_SQL, Long.class, key);
        if (existing.isEmpty()) {
            try {
                jdbc.update(INSERT_SQL, key, now, expires);
                return 1;
            } catch (DataIntegrityViolationException dup) {
                // Carrera: otro hilo insertó primero — continúa por la rama de incremento.
            }
            existing = jdbc.queryForList(SELECT_WINDOW_SQL, Long.class, key);
        }
        long windowStart = existing.isEmpty() ? now : existing.get(0);
        if (windowStart + windowSeconds <= now) {
            jdbc.update(RESET_WINDOW_SQL, now, expires, key);
            return 1;
        }
        jdbc.update(INCREMENT_SQL, expires, key);
        Integer count = jdbc.queryForObject(COUNT_SQL, Integer.class, key);
        return count == null ? 1 : count;
    }
}
