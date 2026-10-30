package com.hotclick.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * M1: HEAD evadía los GetLimit (Spring MVC enruta HEAD al handler de GET y el filtro solo miraba GET y POST).
 * B1: la ruta inválida (400) no contaba contra ningún cupo y escribía un log.warn por request.
 * Datos ficticios; el limitador cuenta de verdad (ventana fija en memoria).
 */
class RateLimitHeadYRutaInvalidaTest {

    private static final String IP = "1.2.3.4";

    private static RateLimiter limitadorQueCuenta() {
        Map<String, Integer> cuentas = new ConcurrentHashMap<>();
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenAnswer(inv ->
            cuentas.merge(inv.getArgument(0, String.class), 1, Integer::sum) <= inv.getArgument(1, Integer.class));
        return rl;
    }

    /** La IP sale del header X-Test-Ip (o IP por defecto) para probar cupos por IP distinta. */
    private static RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenAnswer(inv -> {
            String h = inv.getArgument(0, jakarta.servlet.http.HttpServletRequest.class).getHeader("X-Test-Ip");
            return h != null ? h : IP;
        });
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private static int llamar(RateLimitingFilter f, String metodo, String uri, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, uri);
        req.setRequestURI(uri);
        if (ip != null) req.addHeader("X-Test-Ip", ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    private static int llamar(RateLimitingFilter f, String metodo, String uri) throws Exception {
        return llamar(f, metodo, uri, null);
    }

    // ───────────── M1: HEAD ─────────────

    @ParameterizedTest(name = "HEAD {0} agota {1} y da 429")
    @CsvSource({
        "/api/hacienda/contribuyente/123456789, 10",
        "/api/gift-cards/validar, 30",
        "/api/categorias, 60",
        "/api/public/tienda-rapida/tokenficticio, 20"
    })
    void head_agotaElTopeDelGetLimit(String uri, int max) throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < max; i++) {
            assertThat(llamar(f, "HEAD", uri)).as("HEAD #%d", i + 1).isNotEqualTo(429);
        }
        assertThat(llamar(f, "HEAD", uri)).as("HEAD tras el tope").isEqualTo(429);
    }

    @ParameterizedTest(name = "HEAD y GET comparten cupo en {0}")
    @CsvSource({
        "/api/hacienda/contribuyente/123456789, 10",
        "/api/gift-cards/validar, 30",
        "/api/categorias, 60"
    })
    void headYGet_comparten_elMismoCupo(String uri, int max) throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < max; i++) {
            String metodo = (i % 2 == 0) ? "HEAD" : "GET";
            assertThat(llamar(f, metodo, uri)).as("%s #%d", metodo, i + 1).isNotEqualTo(429);
        }
        // Agotado el cupo con la mezcla, ambos métodos reciben 429.
        assertThat(llamar(f, "GET", uri)).as("GET tras mezclar").isEqualTo(429);
        assertThat(llamar(f, "HEAD", uri)).as("HEAD tras mezclar").isEqualTo(429);
    }

    @Test
    void head_conRutaCodificada_tambienCuentaEnElMismoCupo() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < 10; i++) {
            String uri = (i % 2 == 0) ? "/api/hacienda/%63ontribuyente/123456789" : "/api/hacienda/contribuyente/123456789";
            assertThat(llamar(f, "HEAD", uri)).isNotEqualTo(429);
        }
        assertThat(llamar(f, "HEAD", "/api/hacienda/%63ontribuyente/1")).isEqualTo(429);
        assertThat(llamar(f, "GET", "/api/hacienda/contribuyente/1")).isEqualTo(429);
    }

    @Test
    void head_porIpDistinta_noComparteCupo_yRutaSinLimiteNoSeAfecta() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < 10; i++) llamar(f, "HEAD", "/api/hacienda/contribuyente/1", "9.9.9.9");
        assertThat(llamar(f, "HEAD", "/api/hacienda/contribuyente/1", "9.9.9.9")).isEqualTo(429);
        assertThat(llamar(f, "HEAD", "/api/hacienda/contribuyente/1", "8.8.8.8")).isEqualTo(200);
        for (int i = 0; i < 200; i++) assertThat(llamar(f, "HEAD", "/api/health")).isEqualTo(200);
    }

    /**
     * Otros métodos (informe, sin cambio de código): OPTIONS no ejecuta handler (Spring responde el preflight
     * sin llamar al controlador) y PUT/PATCH/DELETE no tienen ningún GetLimit bajo la misma ruta; ninguno
     * consume ni agota el cupo de GET. Se fija para que un cambio futuro sea deliberado.
     */
    @Test
    void options_put_patch_delete_noConsumenElCupoDeGet() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (String m : new String[]{"OPTIONS", "PUT", "PATCH", "DELETE"}) {
            for (int i = 0; i < 50; i++) {
                assertThat(llamar(f, m, "/api/hacienda/contribuyente/123456789")).as(m).isEqualTo(200);
            }
        }
        for (int i = 0; i < 10; i++) assertThat(llamar(f, "GET", "/api/hacienda/contribuyente/123456789")).isEqualTo(200);
        assertThat(llamar(f, "GET", "/api/hacienda/contribuyente/123456789")).isEqualTo(429);
    }

    @Test
    void head_aUnPostLimitado_noConsumeElCupoDelPost() throws Exception {
        // HEAD a una ruta solo-POST da 405 en MVC (no ejecuta el handler): no debe gastar el cupo de login.
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < 50; i++) assertThat(llamar(f, "HEAD", "/api/auth/login")).isEqualTo(200);
        for (int i = 0; i < 10; i++) assertThat(llamar(f, "POST", "/api/auth/login")).isEqualTo(200);
        assertThat(llamar(f, "POST", "/api/auth/login")).isEqualTo(429);
    }

    // ───────────── B1: ruta inválida ─────────────

    @Test
    void rutaInvalida_cuentaContraUnCupoPorIp_yLuegoDa429() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < 20; i++) {
            assertThat(llamar(f, "GET", "/api/gift-cards/%zz")).as("inválida #%d", i + 1).isEqualTo(400);
        }
        assertThat(llamar(f, "GET", "/api/gift-cards/%zz")).as("excede el cupo").isEqualTo(429);
        assertThat(llamar(f, "POST", "/api/auth/%")).as("otro método, misma IP").isEqualTo(429);
        // Otra IP tiene su propio cupo.
        assertThat(llamar(f, "GET", "/api/gift-cards/%zz", "7.7.7.7")).isEqualTo(400);
        // Las rutas válidas de la IP castigada no consumen ni sufren ese cupo.
        assertThat(llamar(f, "GET", "/api/health")).isEqualTo(200);
    }

    @Test
    void rutaInvalida_noGastaElCupoDeLasRutasValidas() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < 15; i++) llamar(f, "GET", "/api/gift-cards/%zz");
        for (int i = 0; i < 30; i++) assertThat(llamar(f, "GET", "/api/gift-cards/validar")).isEqualTo(200);
        assertThat(llamar(f, "GET", "/api/gift-cards/validar")).isEqualTo(429);
    }

    @Test
    void rutaInvalida_logueaUnaSolaVezPorIpYVentana() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(RateLimitingFilter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        Level anterior = logger.getLevel();
        logger.setLevel(Level.WARN);
        try {
            RateLimitingFilter f = filtro(limitadorQueCuenta());
            for (int i = 0; i < 100; i++) llamar(f, "GET", "/api/gift-cards/%zz");
            long rutaInvalida = appender.list.stream()
                .filter(e -> e.getFormattedMessage().contains("ruta no canónica")).count();
            assertThat(rutaInvalida).as("100 requests inválidas de la misma IP").isEqualTo(1);
            llamar(f, "GET", "/api/gift-cards/%zz", "6.6.6.6");
            long conOtraIp = appender.list.stream()
                .filter(e -> e.getFormattedMessage().contains("ruta no canónica")).count();
            assertThat(conOtraIp).as("otra IP tiene su propio log").isEqualTo(2);
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(anterior);
        }
    }
}
