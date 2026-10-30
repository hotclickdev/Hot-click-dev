package com.hotclick.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.scheduler.RateLimitLimpiezaScheduler;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * BAJOS de #398 (Seguridad), punto 6:
 * (a) cada ruta inválida abría DOS filas por IP en hot_click_rate_limit_tb (cupo + cupo del log) y unas 8 consultas;
 *     con muchas IPs (IPv6) la tabla crecía hasta la limpieza. Ahora solo el cupo toca la BD (1 fila por IP) y la
 *     limpieza de vencidos corre cada 5 minutos.
 * (b) con la BD caída, el muestreo del log (que dependía de tryAcquire, fail-open) se anulaba y salía un warn por
 *     request. Ahora el muestreo usa un contador local en memoria.
 * Datos ficticios (IPs de documentación).
 */
class RateLimitRutaInvalidaFilasYLogTest {

    private static RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenAnswer(inv ->
            inv.getArgument(0, jakarta.servlet.http.HttpServletRequest.class).getHeader("X-Test-Ip"));
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private static int llamarInvalida(RateLimitingFilter f, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/gift-cards/%zz");
        req.setRequestURI("/api/gift-cards/%zz");
        req.addHeader("X-Test-Ip", ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void rutaInvalida_soloAbreUnaFilaPorIp() throws Exception {
        Set<String> llaves = ConcurrentHashMap.newKeySet();
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt()))
            .thenAnswer(inv -> {
                llaves.add(inv.getArgument(0, String.class));
                return true;
            });
        RateLimitingFilter f = filtro(rl);
        int ips = 50;
        for (int i = 0; i < ips; i++) {
            for (int k = 0; k < 3; k++) llamarInvalida(f, "203.0.113." + (i + 1)); // IPv4 distintas: las IPv6 del mismo /64 comparten llave (B2)
        }
        assertThat(llaves).as("una llave (una fila) por IP, sin la llave aparte del log").hasSize(ips);
        assertThat(llaves).allSatisfy(k -> assertThat(k).endsWith(":ruta-invalida"));
    }

    @Test
    void limpiezaDeVencidos_correCadaCincoMinutos() throws Exception {
        Scheduled s = RateLimitLimpiezaScheduler.class.getMethod("limpiarProgramado").getAnnotation(Scheduled.class);
        assertThat(s.fixedDelay()).as("fixedDelay en ms").isLessThanOrEqualTo(300_000L);
    }

    @Test
    void baseCaida_elLogDeRutaInvalidaSigueMuestreado() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(RateLimitingFilter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        Level anterior = logger.getLevel();
        logger.setLevel(Level.WARN);
        try {
            JdbcTemplate caida = mock(JdbcTemplate.class);
            when(caida.execute(any(org.springframework.jdbc.core.ConnectionCallback.class)))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("BD caída (ficticia)"));
            RateLimitingFilter f = filtro(new RateLimiter(caida));

            for (int i = 0; i < 100; i++) {
                assertThat(llamarInvalida(f, "203.0.113.7")).as("fail-open: sigue dando 400").isEqualTo(400);
            }
            List<ILoggingEvent> propios = appender.list.stream()
                .filter(e -> e.getFormattedMessage().contains("ruta no canónica")).toList();
            assertThat(propios).as("100 requests inválidas de la misma IP con la BD caída").hasSize(1);

            llamarInvalida(f, "203.0.113.8");
            assertThat(appender.list.stream()
                .filter(e -> e.getFormattedMessage().contains("ruta no canónica")).count())
                .as("otra IP tiene su propio log").isEqualTo(2);
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(anterior);
        }
    }
}
