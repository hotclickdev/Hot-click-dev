package com.hotclick.security;

import com.hotclick.controller.EmpresaPerfilController;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.EmpresaPerfilService;
import com.hotclick.service.hacienda.PinCertIncorrectoException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Carrera "revisar el tope / contar el fallo" del PIN del .p12 (PR 584), contra PostgreSQL REAL.
 *
 * Ejerce el ORDEN REAL de {@link EmpresaPerfilController#guardarPinCert}: reservar el intento (UPSERT atómico de
 * {@link RateLimiter}, el SQL real, no una copia) → y SOLO si hay cupo, probar el PIN. La prueba del PIN es
 * {@link EmpresaPerfilService#guardarPinCert} (el único camino a {@code FirmaDigitalService.cargar()}); aquí es un
 * seam que cuenta invocaciones y responde "PIN incorrecto". 20 hilos, misma empresa, usuario e IP, misma barrera:
 * si el seam se invoca MÁS DE 5 veces el test falla. Si alguien vuelve a contar el fallo DESPUÉS de probar el PIN
 * (orden viejo), los 20 hilos leen "sin bloqueo" y se prueban 20 PINs.
 *
 * Opt-in como RateLimiterPostgresTest: {@code HC_PG_TEST_URL=jdbc:postgresql://host:puerto/db?user=…}. Schema
 * temporal propio, borrado al terminar. Nunca apuntar al Postgres de QA.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[PIN-CARRERA] reservar antes de probar el PIN: 20 hilos concurrentes, máximo 5 PIN probados (PostgreSQL)")
class PinCertReservaConcurrentePostgresTest {

    private static final String SCHEMA = "hc_pincert_race_test";
    private static final int HILOS = 20;

    private JdbcTemplate jdbc;
    private DriverManagerDataSource ds;

    @BeforeEach
    void setUp() {
        String base = System.getenv("HC_PG_TEST_URL");
        new JdbcTemplate(new DriverManagerDataSource(base)).execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        new JdbcTemplate(new DriverManagerDataSource(base)).execute("CREATE SCHEMA " + SCHEMA);
        ds = new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
        // Igual que V52__rate_limit_table.sql
        jdbc.execute("""
            CREATE TABLE hot_click_rate_limit_tb (
                bucket_key   VARCHAR(200) PRIMARY KEY,
                count        INTEGER      NOT NULL DEFAULT 0,
                window_start BIGINT       NOT NULL,
                expires_at   BIGINT       NOT NULL)
            """);
    }

    @AfterEach
    void tearDown() {
        new JdbcTemplate(new DriverManagerDataSource(System.getenv("HC_PG_TEST_URL")))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    private EmpresaPerfilController controller(AtomicInteger pinesProbados) {
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(scope.getCurrentUserId()).thenReturn(11L);
        PropietarioGuard guard = mock(PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(anyLong())).thenReturn(true);
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("203.0.113.5");
        EmpresaPerfilService servicio = mock(EmpresaPerfilService.class);
        when(servicio.guardarPinCert(anyLong(), any())).thenAnswer(inv -> {
            pinesProbados.incrementAndGet();      // aquí se abriría el .p12 (FirmaDigitalService.cargar)
            Thread.sleep(40);                      // el .p12 tarda: agranda la ventana de la carrera del orden viejo
            throw new PinCertIncorrectoException();
        });
        EmpresaPerfilController c = new EmpresaPerfilController();
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "empresaPerfilService", servicio);
        ReflectionTestUtils.setField(c, "propietarioGuard", guard);
        ReflectionTestUtils.setField(c, "pinLimiter", new PinCertIntentosLimiter(new RateLimiter(jdbc)));
        ReflectionTestUtils.setField(c, "clientIpResolver", ip);
        return c;
    }

    @Test
    @DisplayName("20 hilos (misma empresa, usuario e IP, misma barrera): se prueban como máximo 5 PIN; los otros 15 reciben 429 sin abrir el .p12")
    void veintePedidosSimultaneos_maximoCincoPinesProbados() throws Exception {
        AtomicInteger probados = new AtomicInteger();
        EmpresaPerfilController c = controller(probados);
        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        CountDownLatch listos = new CountDownLatch(HILOS);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Integer>> estados = new ArrayList<>();
        for (int i = 0; i < HILOS; i++) {
            estados.add(pool.submit(() -> {
                listos.countDown();
                salida.await(10, TimeUnit.SECONDS);
                ResponseEntity<ResponseDTO> r = c.guardarPinCert(Map.of("pin", "0000"), new MockHttpServletRequest());
                return r.getStatusCode().value();
            }));
        }
        assertThat(listos.await(10, TimeUnit.SECONDS)).isTrue();
        salida.countDown();
        int c400 = 0, c429 = 0, otros = 0;
        for (Future<Integer> f : estados) {
            int st = f.get(30, TimeUnit.SECONDS);
            if (st == 400) c400++; else if (st == 429) c429++; else otros++;
        }
        pool.shutdownNow();

        assertThat(probados.get()).as("PIN probados (invocaciones del seam que abre el .p12)").isLessThanOrEqualTo(5);
        // Cada eje numera por su cuenta: con contención un hilo puede ser el 3.º en empresa y el 7.º en IP y
        // consumir cupo sin pasar, así que pueden pasar MENOS de 5 (seguro). Nunca más.
        assertThat(c400).as("pedidos que llegaron a probar el PIN (400)").isBetween(1, 5).isEqualTo(probados.get());
        assertThat(c429).as("pedidos negados sin probar el PIN (429)").isEqualTo(HILOS - c400);
        assertThat(otros).isZero();
        // El 6.º (y solo el 6.º) escribió el bloqueo: una reincidencia, no 15
        assertThat(jdbc.queryForObject("SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = 'pincert:strike:emp:7'",
            Integer.class)).isEqualTo(1);
    }
}
