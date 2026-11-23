package com.hotclick.integration;

import com.hotclick.repository.TelegramVinculacionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.lang.reflect.Method;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Canje del código de vinculación de Telegram vs revocación, en PostgreSQL real (PR 593, B1).
 *
 * <p>Ejecuta el SQL REAL de {@code TelegramVinculacionRepository.canjearCodigo} y {@code revocarPorId} (se leen de su
 * {@code @Query}, no se copian). Casos: (1) revocación ya committeada antes del canje → el canje no gana y la fila queda
 * REVOCADA; (2) revocación concurrente con el canje (espera el lock) → termina REVOCADA, sin código ni chat;
 * (3) dos canjes simultáneos del mismo código → exactamente uno gana, un solo chat ACTIVA, código null; (4) código vencido.
 * Opt-in: {@code HC_PG_TEST_URL=jdbc:postgresql://host:puerto/db?user=…} (job {@code onvo-alta-pg} de ci.yml con su gate
 * {@code scripts/ci/telegram-vinculacion-canje-pg-surefire.py}; NO apuntar al Postgres de QA). Schema propio, se crea y se borra.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[PG] Canje de código de Telegram vs revocación: atómico, una sola ganadora, la revocación no se pisa")
class TelegramVinculacionCanjeConcurrentePostgresTest {

    private static final String SCHEMA = "hc_tg_canje_concurrente_test";
    private static final String CODIGO = "ABCD2345";
    private static final Pattern PARAM = Pattern.compile(":(\\w+)");

    private DriverManagerDataSource ds;
    private JdbcTemplate jdbc;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        String base = System.getenv("HC_PG_TEST_URL");
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(base));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        ds = new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
        tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        jdbc.execute("""
            CREATE TABLE hot_click_telegram_vinculacion_tb (
                id_vinculacion BIGSERIAL PRIMARY KEY,
                fk_id_usuario BIGINT NOT NULL,
                chat_id BIGINT,
                telegram_username VARCHAR(64),
                fk_id_empresa_activa BIGINT,
                codigo VARCHAR(16),
                codigo_expira TIMESTAMP,
                contexto TEXT,
                estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
                fecha_vinculacion TIMESTAMP,
                version INTEGER NOT NULL DEFAULT 0)
            """);
    }

    @AfterEach
    void tearDown() {
        new JdbcTemplate(new DriverManagerDataSource(System.getenv("HC_PG_TEST_URL")))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    private long fila(String estado, LocalDateTime expira) {
        return jdbc.queryForObject("""
            INSERT INTO hot_click_telegram_vinculacion_tb (fk_id_usuario, codigo, codigo_expira, estado, contexto)
            VALUES (1, ?, ?, ?, 'ctx') RETURNING id_vinculacion
            """, Long.class, CODIGO, Timestamp.valueOf(expira), estado);
    }

    private static String sqlDe(String metodo) throws Exception {
        for (Method m : TelegramVinculacionRepository.class.getMethods()) {
            if (m.getName().equals(metodo)) return m.getAnnotation(Query.class).value();
        }
        throw new IllegalStateException("no existe " + metodo);
    }

    /** Ejecuta el UPDATE nativo del repositorio pasando los parámetros por nombre (cada :nombre pasa a ?). */
    private int ejecutar(JdbcTemplate j, String metodo, Map<String, Object> args) throws Exception {
        String sql = sqlDe(metodo);
        List<Object> valores = new ArrayList<>();
        Matcher m = PARAM.matcher(sql);
        while (m.find()) valores.add(args.get(m.group(1)));
        return j.update(PARAM.matcher(sql).replaceAll("?"), valores.toArray());
    }

    private int canjear(JdbcTemplate j, long id, long chat) throws Exception {
        return ejecutar(j, "canjearCodigo", Map.of("id", id, "codigo", CODIGO, "chatId", chat,
            "username", "u" + chat, "ahora", Timestamp.valueOf(LocalDateTime.now())));
    }

    private Map<String, Object> estado(long id) {
        return jdbc.queryForMap("SELECT estado, chat_id, codigo, codigo_expira, contexto FROM hot_click_telegram_vinculacion_tb "
            + "WHERE id_vinculacion = ?", id);
    }

    @Test
    @DisplayName("revocación ya committeada antes del canje: el canje no gana y la fila sigue REVOCADA, sin chat ni código")
    void revocacionPrevia() throws Exception {
        long id = fila("ACTIVA", LocalDateTime.now().plusMinutes(5));
        // el atacante leyó la fila (id + código) ANTES de la revocación; ahora la revocación commitea
        ejecutar(jdbc, "revocarPorId", Map.of("id", id));
        // un canje tardío con esa lectura vieja no puede resucitarla
        int ganadas = tx.execute(st -> {
            try { return canjear(jdbc, id, 777001L); } catch (Exception e) { throw new IllegalStateException(e); }
        });
        assertThat(ganadas).isZero();
        Map<String, Object> f = estado(id);
        assertThat(f.get("estado")).isEqualTo("REVOCADA");
        assertThat(f.get("chat_id")).isNull();
        assertThat(f.get("codigo")).isNull();
        assertThat(f.get("contexto")).isNull();
    }

    @Test
    @DisplayName("revocación concurrente con el canje (espera el lock): termina REVOCADA, sin chat, sin código")
    void revocacionConcurrenteConElCanje() throws Exception {
        long id = fila("PENDIENTE", LocalDateTime.now().plusMinutes(5));
        CountDownLatch canjeTomoLock = new CountDownLatch(1);
        CountDownLatch revocacionLanzada = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<Integer> canje = pool.submit(() -> tx.execute(st -> {
            try {
                int n = canjear(jdbc, id, 777001L);       // toma el lock de la fila
                canjeTomoLock.countDown();
                revocacionLanzada.await(10, TimeUnit.SECONDS);
                Thread.sleep(500);                          // la revocación ya está esperando el lock
                return n;                                   // commit
            } catch (Exception e) { throw new IllegalStateException(e); }
        }));
        Future<Integer> revoca = pool.submit(() -> {
            canjeTomoLock.await(10, TimeUnit.SECONDS);
            revocacionLanzada.countDown();
            return tx.execute(st -> {
                try { return ejecutar(jdbc, "revocarPorId", Map.of("id", id)); }
                catch (Exception e) { throw new IllegalStateException(e); }
            });
        });
        assertThat(canje.get(30, TimeUnit.SECONDS)).isEqualTo(1);
        assertThat(revoca.get(30, TimeUnit.SECONDS)).isEqualTo(1);
        pool.shutdownNow();

        Map<String, Object> f = estado(id);
        assertThat(f.get("estado")).isEqualTo("REVOCADA"); // la revocación (posterior) manda: nunca ACTIVA con el chat del atacante
        assertThat(f.get("chat_id")).isNull();
        assertThat(f.get("codigo")).isNull();
        assertThat(f.get("codigo_expira")).isNull();
    }

    @Test
    @DisplayName("dos canjes simultáneos del mismo código: exactamente uno gana, un solo chat ACTIVA, código null")
    void dosCanjesSimultaneos() throws Exception {
        long id = fila("PENDIENTE", LocalDateTime.now().plusMinutes(5));
        int hilos = 2;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Integer>> resultados = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            long chat = 777001L + i;
            resultados.add(pool.submit(() -> {
                listos.countDown();
                salida.await(10, TimeUnit.SECONDS);
                return tx.execute(st -> {
                    try { return canjear(jdbc, id, chat); } catch (Exception e) { throw new IllegalStateException(e); }
                });
            }));
        }
        assertThat(listos.await(10, TimeUnit.SECONDS)).isTrue();
        salida.countDown();
        List<Integer> filas = new ArrayList<>();
        for (Future<Integer> f : resultados) filas.add(f.get(30, TimeUnit.SECONDS));
        pool.shutdownNow();

        assertThat(filas).containsExactlyInAnyOrder(0, 1);
        Map<String, Object> f = estado(id);
        assertThat(f.get("estado")).isEqualTo("ACTIVA");
        assertThat((Long) f.get("chat_id")).isIn(777001L, 777002L);
        assertThat(f.get("codigo")).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM hot_click_telegram_vinculacion_tb WHERE estado = 'ACTIVA'",
            Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("código vencido: el canje no gana (0 filas) y no escribe nada")
    void codigoVencido() throws Exception {
        long id = fila("PENDIENTE", LocalDateTime.now().minusMinutes(1));
        assertThat(canjear(jdbc, id, 777001L)).isZero();
        Map<String, Object> f = estado(id);
        assertThat(f.get("estado")).isEqualTo("PENDIENTE");
        assertThat(f.get("chat_id")).isNull();
    }
}
