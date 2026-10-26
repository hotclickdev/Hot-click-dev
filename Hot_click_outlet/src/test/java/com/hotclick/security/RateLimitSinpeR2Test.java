package com.hotclick.security;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.service.SecurityAuditService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** H-07 r2: B-1 (clave decodificada/normalizada), (b) fail-open, (c) ruta autenticada. */
@DisplayName("[H-07 r2] Rate limit SINPE: evasión por encoding, fail-open, ruta autenticada")
class RateLimitSinpeR2Test {

    @RestController
    static class C {
        final List<String> vistos = new ArrayList<>();
        @PostMapping("/api/sinpe/guest/{n}/comprobante") String g(@PathVariable String n) { vistos.add(n); return n; }
        @PostMapping("/api/sinpe/{n}/comprobante") String a(@PathVariable String n) { vistos.add(n); return n; }
    }

    private final Map<String, Integer> c = new HashMap<>();
    private RateLimitingFilter f;
    private RateLimiter l;
    private C ctrl;
    private MockMvc mvc;
    private String ip = "198.51.100.7";

    @BeforeEach
    void setUp() {
        f = new RateLimitingFilter();
        l = mock(RateLimiter.class);
        when(l.tryAcquire(anyString(), anyInt(), anyInt()))
            .thenAnswer(i -> c.merge(i.getArgument(0), 1, Integer::sum) <= (int) i.getArgument(1));
        ClientIpResolver ips = mock(ClientIpResolver.class);
        when(ips.resolve(any())).thenAnswer(i -> ip);
        ReflectionTestUtils.setField(f, "rateLimiter", l);
        ReflectionTestUtils.setField(f, "clientIpResolver", ips);
        ReflectionTestUtils.setField(f, "auditService", mock(SecurityAuditService.class));
        ctrl = new C();
        mvc = MockMvcBuilders.standaloneSetup(ctrl).addFilters(f).build();
    }

    private int st(String uri) throws Exception {
        return mvc.perform(post(URI.create(uri))).andReturn().getResponse().getStatus();
    }

    @Test
    @DisplayName("B-1: variantes codificadas/minúsculas/espacios de HC-1001 comparten el tope de 5")
    void variantesCompartenTope() throws Exception {
        // ip-cap alto para aislar el tope pedido+IP
        ReflectionTestUtils.setField(f, "sinpeCompIpMax", 1000);
        String[] vars = {"HC-1001", "HC%2D1001", "%48C-1001", "H%43-1001", "HC-%31001", "HC-1%3001",
                         "HC-10%301", "HC-100%31", "%48%43-1001", "hc-1001", "Hc-1001", "%20HC-1001%20", "HC-%201001"};
        int ok = 0;
        for (int r = 0; r < 3; r++) for (String v : vars) if (st("/api/sinpe/guest/" + v + "/comprobante") == 200) ok++;
        assertThat(ok).isEqualTo(5);
        assertThat(c.keySet().stream().filter(k -> k.startsWith("pedido-ip:"))).containsExactly("pedido-ip:guest:HC-1001:" + ip);
    }

    @Test
    @DisplayName("B-1: formato inválido o doble encoding -> 400 sin consumir cupo")
    void invalido400SinCupo() throws Exception {
        for (String v : new String[]{"%2548C-1001", "HC_1001", "1001", "HC-", "%3Cscript%3E", "HC-1001%00", "HC-%E2%82%AC1", "H%C5%BF-1001", "%C4%B1RD-1A2B"}) {
            assertThat(st("/api/sinpe/guest/" + v + "/comprobante")).as(v).isEqualTo(400);
            assertThat(st("/api/sinpe/" + v + "/comprobante")).as(v).isEqualTo(400);
        }
        verify(l, never()).tryAcquire(anyString(), anyInt(), anyInt());
        assertThat(ctrl.vistos).isEmpty();
    }

    @Test
    @DisplayName("B-1: formato real ORD-/POS-QR- (Constants.generarNumeroPedido) es aceptado")
    void formatoReal() {
        assertThat(NumeroPedidoNormalizer.normalizar("ORD-1A2B3C4D5E6F")).isEqualTo("ORD-1A2B3C4D5E6F");
        assertThat(NumeroPedidoNormalizer.normalizar("pos-qr-1a2b3c4d5e6f")).isEqualTo("POS-QR-1A2B3C4D5E6F");
        assertThat(NumeroPedidoNormalizer.normalizar(" QR-ABC ")).isEqualTo("QR-ABC");
        assertThat(NumeroPedidoNormalizer.normalizar("ORD-1/2")).isNull();
        // O-2: ſ e ı colapsarían a S/I con toUpperCase
        assertThat(NumeroPedidoNormalizer.normalizar("hc-1001".replace('c', '\u017F'))).isNull();
        assertThat(NumeroPedidoNormalizer.normalizar("\u0131RD-1A2B")).isNull();
        assertThat(NumeroPedidoNormalizer.normalizarSegmento("HC-1%C5%BF01")).isNull();
    }

    @Test
    @DisplayName("(c) ruta autenticada /api/sinpe/{n}/comprobante: 5 por pedido+IP y tope por IP configurable")
    void rutaAutenticada() throws Exception {
        for (int i = 0; i < 5; i++) assertThat(st("/api/sinpe/%48C-2001/comprobante")).isEqualTo(200);
        assertThat(st("/api/sinpe/hc-2001/comprobante")).isEqualTo(429);
        ReflectionTestUtils.setField(f, "sinpeAuthIpMax", 7);
        c.clear();
        for (int i = 0; i < 7; i++) assertThat(st("/api/sinpe/HC-30" + i + "/comprobante")).isEqualTo(200);
        assertThat(st("/api/sinpe/HC-399/comprobante")).isEqualTo(429);
        // cupos separados de la ruta invitado
        assertThat(st("/api/sinpe/guest/HC-399/comprobante")).isEqualTo(200);
    }

    @Test
    @DisplayName("(b) fail-open: incrementa rate.limiter.fail_open y loguea solo la clase, sin getMessage")
    void failOpenMetricaYLog() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), eq(Long.class), any()))
            .thenThrow(new CannotGetJdbcConnectionException("jdbc:postgresql://db-interno:5432 user=secreto"));
        SimpleMeterRegistry reg = new SimpleMeterRegistry();
        RateLimiter real = new RateLimiter(jdbc, reg);
        Logger lg = (Logger) LoggerFactory.getLogger(RateLimiter.class);
        ListAppender<ILoggingEvent> app = new ListAppender<>();
        app.start();
        lg.addAppender(app);
        try {
            assertThat(real.tryAcquire("k", 1, 60)).isTrue();
            assertThat(real.tryAcquire("k", 1, 60)).isTrue();
        } finally {
            lg.detachAppender(app);
        }
        assertThat(reg.counter(RateLimiter.METRICA_FAIL_OPEN).count()).isEqualTo(2.0);
        assertThat(app.list).isNotEmpty();
        app.list.forEach(e -> {
            assertThat(e.getFormattedMessage()).contains("CannotGetJdbcConnectionException")
                .doesNotContain("secreto").doesNotContain("db-interno");
            assertThat(e.getThrowableProxy()).isNull();
        });
        // sin registry no rompe
        assertThat(new RateLimiter(jdbc).tryAcquire("k", 1, 60)).isTrue();
    }
}
