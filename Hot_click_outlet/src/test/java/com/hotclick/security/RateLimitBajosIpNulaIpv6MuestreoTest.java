package com.hotclick.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.github.benmanes.caffeine.cache.Cache;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.auth.AuthEmailOtpHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * BAJOS de #395/#398/#416 (Seguridad): B1 IP nula en la ruta inválida (NPE → 500), B2 IPv6 por /64 en las llaves del
 * limitador y expulsión del cache de muestreo, B3 aviso de BD caída muestreado con contador local y sin stack en el
 * warn del OTP por correo. Datos ficticios (IPs de documentación 2001:db8::/32 y 203.0.113.0/24).
 */
class RateLimitBajosIpNulaIpv6MuestreoTest {

    // ───────────── helpers ─────────────

    /** Limitador de mentira: cuenta por llave y deja pasar mientras no se exceda el tope pedido. */
    private static RateLimiter limitadorContador(Map<String, Integer> cuentas) {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenAnswer(inv -> {
            int n = cuentas.merge(inv.getArgument(0, String.class), 1, Integer::sum);
            return n <= inv.getArgument(1, Integer.class);
        });
        return rl;
    }

    private static RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        // La IP sale del header de prueba; sin header → null (peer ilegible).
        when(ip.resolve(any())).thenAnswer(inv ->
            inv.getArgument(0, jakarta.servlet.http.HttpServletRequest.class).getHeader("X-Test-Ip"));
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(SecurityAuditService.class));
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

    private static final String INVALIDA = "/api/gift-cards/%zz";

    // ───────────── B1: ipInvalida null ─────────────

    @Test
    @DisplayName("B1: ruta inválida con IP null no lanza NPE (500): responde 400 y comparte la llave 'desconocida'")
    void rutaInvalidaConIpNula_noTiraNpe_yFallaCerrado() throws Exception {
        Map<String, Integer> cuentas = new ConcurrentHashMap<>();
        RateLimitingFilter f = filtro(limitadorContador(cuentas));

        assertThat(llamar(f, "GET", INVALIDA, null)).as("sin NPE ni 500").isEqualTo(400);
        assertThat(cuentas).containsOnlyKeys("ip:desconocida:ruta-invalida");
    }

    @Test
    @DisplayName("B1: las IP nulas comparten un solo cupo (fail-closed): la 21ª ruta inválida da 429")
    void rutaInvalidaConIpNula_cuentaContraUnCupo() throws Exception {
        RateLimitingFilter f = filtro(limitadorContador(new ConcurrentHashMap<>()));
        int ultimo = 0;
        for (int i = 1; i <= 25; i++) ultimo = llamar(f, "GET", INVALIDA, null);
        assertThat(ultimo).isEqualTo(429);
    }

    @Test
    @DisplayName("B1: GET y POST con IP nula tampoco tiran NPE y usan la llave 'desconocida'")
    void rutaValidaConIpNula_usaLlaveDesconocida() throws Exception {
        Map<String, Integer> cuentas = new ConcurrentHashMap<>();
        RateLimitingFilter f = filtro(limitadorContador(cuentas));

        assertThat(llamar(f, "POST", "/api/auth/login", null)).isEqualTo(200);
        assertThat(llamar(f, "GET", "/api/hacienda/contribuyente/1", null)).isEqualTo(200);
        assertThat(cuentas).containsOnlyKeys(
            "ip:desconocida:/api/auth/login", "ip:desconocida:GET:/api/hacienda/contribuyente");
    }

    // ───────────── B2: IPv6 por /64 ─────────────

    @Test
    @DisplayName("B2: direcciones distintas del mismo /64 comparten el cupo de ruta inválida (la 21ª da 429)")
    void ipv6MismoPrefijo_compartenCupoDeRutaInvalida() throws Exception {
        RateLimitingFilter f = filtro(limitadorContador(new ConcurrentHashMap<>()));
        int ultimo = 0;
        for (int i = 1; i <= 25; i++) ultimo = llamar(f, "GET", INVALIDA, "2001:db8:1:2::" + Integer.toHexString(i));
        assertThat(ultimo).as("rotar el host dentro del /64 no abre cupos nuevos").isEqualTo(429);
    }

    @Test
    @DisplayName("B2: POST y GET usan la llave del /64; otro /64 y la IPv4 tienen la suya")
    void llavesPorPrefijo64_enPostYGet() throws Exception {
        Map<String, Integer> cuentas = new ConcurrentHashMap<>();
        RateLimitingFilter f = filtro(limitadorContador(cuentas));

        llamar(f, "POST", "/api/auth/login", "2001:db8:1:2::1");
        llamar(f, "POST", "/api/auth/login", "2001:db8:1:2:aaaa:bbbb:cccc:dddd");
        llamar(f, "POST", "/api/auth/login", "2001:db8:1:3::1");
        llamar(f, "POST", "/api/auth/login", "203.0.113.5");
        llamar(f, "GET", "/api/hacienda/contribuyente/1", "2001:db8:1:2::9");
        llamar(f, "HEAD", "/api/hacienda/contribuyente/2", "2001:db8:1:2::a");

        assertThat(cuentas).containsEntry("ip:2001:0db8:0001:0002::/64:/api/auth/login", 2)
            .containsEntry("ip:2001:0db8:0001:0003::/64:/api/auth/login", 1)
            .containsEntry("ip:203.0.113.5:/api/auth/login", 1)
            .containsEntry("ip:2001:0db8:0001:0002::/64:GET:/api/hacienda/contribuyente", 2)
            .hasSize(4);
    }

    @Test
    @DisplayName("B2: el resto del limitador ya usa el mismo /64 (AuthSupport.ipCliente delega en IpParaLlave)")
    void authSupportYFiltro_usanLaMismaReduccion() {
        assertThat(IpParaLlave.reducir("2001:db8:1:2::1")).isEqualTo("2001:0db8:0001:0002::/64");
        assertThat(IpParaLlave.reducir("64:ff9b::cb00:7105")).isEqualTo("203.0.113.5");
        assertThat(IpParaLlave.reducir("::ffff:203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(IpParaLlave.reducir(null)).isNull();
        assertThat(IpParaLlave.clave(null)).isEqualTo("desconocida");
        assertThat(IpParaLlave.clave("  ")).isEqualTo("desconocida");
    }

    @SuppressWarnings("unchecked")
    private static Cache<String, Boolean> cacheDeMuestreo(RateLimitingFilter f) {
        return (Cache<String, Boolean>) ReflectionTestUtils.getField(f, "logRutaInvalida");
    }

    @Test
    @DisplayName("B2: 12 000 direcciones del mismo /64 dejan UNA sola entrada en el cache de muestreo")
    void muestreo_unaEntradaPorPrefijo64() throws Exception {
        RateLimitingFilter f = filtro(limitadorContador(new ConcurrentHashMap<>()));
        for (int i = 0; i < 12_000; i++) {
            llamar(f, "GET", INVALIDA, "2001:db8:1:2:0:0:" + Integer.toHexString(i >>> 16) + ":" + Integer.toHexString(i & 0xffff));
        }
        Cache<String, Boolean> cache = cacheDeMuestreo(f);
        cache.cleanUp();
        assertThat(cache.estimatedSize()).isEqualTo(1);
    }

    @Test
    @DisplayName("B2: con más de 10 000 /64 distintos el cache expulsa y no pasa del tope (rápido)")
    void muestreo_expulsaPasadoElTope() throws Exception {
        RateLimitingFilter f = filtro(limitadorContador(new ConcurrentHashMap<>()));
        int distintos = 10_500;
        long t0 = System.nanoTime();
        for (int i = 0; i < distintos; i++) {
            llamar(f, "GET", INVALIDA, "2001:db8:" + Integer.toHexString(i) + "::1");
        }
        Cache<String, Boolean> cache = cacheDeMuestreo(f);
        cache.cleanUp();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        assertThat(cache.estimatedSize()).as("tope maximumSize=10000").isLessThanOrEqualTo(10_000).isGreaterThan(5_000);
        assertThat(ms).as("no debe tardar mucho (ms)").isLessThan(30_000);
    }

    // ───────────── B3: warn muestreado con la BD caída ─────────────

    private static ListAppender<ILoggingEvent> escuchar(Class<?> clase, Level nivel) {
        Logger l = (Logger) LoggerFactory.getLogger(clase);
        l.setLevel(nivel);
        ListAppender<ILoggingEvent> a = new ListAppender<>();
        a.start();
        l.addAppender(a);
        return a;
    }

    private static void dejarDeEscuchar(Class<?> clase, ListAppender<ILoggingEvent> a) {
        ((Logger) LoggerFactory.getLogger(clase)).detachAppender(a);
        ((Logger) LoggerFactory.getLogger(clase)).setLevel(null);
    }

    @Test
    @DisplayName("B3: con la BD caída tryAcquire sigue fail-open pero avisa una vez por ventana, con el conteo de omitidos")
    void tryAcquire_baseCaida_warnMuestreado() {
        ListAppender<ILoggingEvent> log = escuchar(RateLimiter.class, Level.WARN);
        try {
            JdbcTemplate caida = mock(JdbcTemplate.class);
            when(caida.execute(any(ConnectionCallback.class))).thenThrow(new DataAccessResourceFailureException("BD caída (ficticia)"));
            RateLimiter rl = new RateLimiter(caida);
            AtomicLong reloj = new AtomicLong(1_000_000L);
            rl.relojMs = reloj::get;

            for (int i = 0; i < 500; i++) assertThat(rl.tryAcquire("ip:203.0.113.7:/api/auth/login", 10, 60)).isTrue();
            List<ILoggingEvent> avisos = propios(log);
            assertThat(avisos).as("500 requests con la BD caída, misma ventana").hasSize(1);
            assertThat(avisos.get(0).getFormattedMessage()).contains("fail-open").contains("omitidos desde el anterior: 0");

            reloj.addAndGet(RateLimiter.VENTANA_WARN_MS + 1);
            rl.tryAcquire("k", 10, 60);
            avisos = propios(log);
            assertThat(avisos).as("pasada la ventana vuelve a avisar").hasSize(2);
            assertThat(avisos.get(1).getFormattedMessage()).contains("omitidos desde el anterior: 499");
        } finally {
            dejarDeEscuchar(RateLimiter.class, log);
        }
    }

    private static List<ILoggingEvent> propios(ListAppender<ILoggingEvent> log) {
        return new ArrayList<>(log.list.stream().filter(e -> e.getFormattedMessage().contains("DB unavailable")).toList());
    }

    // ───────────── B3: AuthEmailOtpHandler warn sin stack ─────────────

    @Test
    @DisplayName("B3: AuthEmailOtpHandler.sendLoginEmailOtp no escribe el stack completo en warn; el saneado va a debug")
    void emailOtpSend_warnSinStack() {
        String pii = "persona.ficticia@example.com";
        ListAppender<ILoggingEvent> log = escuchar(AuthEmailOtpHandler.class, Level.ALL);
        try {
            AuthEmailOtpHandler h = new AuthEmailOtpHandler();
            JwtUtil jwt = mock(JwtUtil.class);
            when(jwt.isTempToken(anyString())).thenThrow(new RuntimeException("falló para " + pii, new IllegalStateException(pii)));
            ReflectionTestUtils.setField(h, "jwtUtil", jwt);

            h.sendLoginEmailOtp(Map.of("tempToken", "t"), new MockHttpServletRequest());

            List<ILoggingEvent> warns = log.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
            assertThat(warns).hasSize(1);
            assertThat(warns.get(0).getThrowableProxy()).as("sin stack trace en el warn").isNull();
            assertThat(warns.get(0).getFormattedMessage()).contains("RuntimeException").contains("IllegalStateException")
                .doesNotContain(pii);
            List<ILoggingEvent> debugs = log.list.stream().filter(e -> e.getLevel() == Level.DEBUG).toList();
            assertThat(debugs).as("el stack saneado se conserva a nivel debug").hasSize(1);
            assertThat(debugs.get(0).getThrowableProxy().getClassName()).endsWith("ExcepcionSaneada");
            assertThat(debugs.get(0).getThrowableProxy().getMessage()).doesNotContain(pii);
        } finally {
            dejarDeEscuchar(AuthEmailOtpHandler.class, log);
        }
    }
}
