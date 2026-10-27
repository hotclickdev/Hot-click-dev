package com.hotclick.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.SuscripcionReposicion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SuscripcionReposicionRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.auth.AuthEmailOtpHandler;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.auth.AuthTenantSwitchHandler;
import com.hotclick.service.auth.AuthTotpVerifyHandler;
import com.hotclick.service.reposicion.AvisoReposicionService;
import com.hotclick.service.reposicion.ReposicionEmailBuilder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * BAJOS de #403 (Seguridad): los logs de error de auth, avisos y Telegram no pueden llevar el texto de la excepción
 * (puede traer el correo o el cuerpo de la respuesta) ni el stack trace con ese texto. Solo clase y estado HTTP.
 * Datos ficticios: el «PII» es un correo inventado que se mete en el mensaje de la excepción y en su causa.
 */
@DisplayName("[BAJO #403] Logs sin getMessage(): solo la clase de la excepción")
class LogsSinMensajeDeExcepcionTest {

    private static final String PII = "pii.fict@test.cr";
    private static final String CUERPO = "{\"description\":\"chat de " + PII + " no existe\"}";

    private final List<Logger> loggers = new java.util.ArrayList<>();
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void setUp() {
        appender.start();
    }

    @AfterEach
    void tearDown() {
        loggers.forEach(l -> l.detachAppender(appender));
    }

    private void escuchar(Class<?> clase) {
        Logger l = (Logger) LoggerFactory.getLogger(clase);
        l.setLevel(Level.ALL);
        l.addAppender(appender);
        loggers.add(l);
    }

    private static RuntimeException conPii() {
        return new RuntimeException("falló para " + PII, new IllegalStateException("causa " + PII));
    }

    /** Todo lo que sale al log (mensaje formateado + cada excepción y causa del stack) sin el PII. */
    private void assertLogLimpio(int esperadosMin) {
        assertThat(appender.list).as("se escribió al menos un log").hasSizeGreaterThanOrEqualTo(esperadosMin);
        for (ILoggingEvent ev : appender.list) {
            StringBuilder todo = new StringBuilder(ev.getFormattedMessage());
            for (var t = ev.getThrowableProxy(); t != null; t = t.getCause()) {
                todo.append(' ').append(t.getClassName()).append(' ').append(t.getMessage());
            }
            assertThat(todo.toString()).as("log: " + ev.getFormattedMessage())
                .doesNotContain(PII).doesNotContain("pii.fict");
            assertThat(ev.getThrowableProxy()).as("sin stack trace en: " + ev.getFormattedMessage()).isNull();
        }
    }

    @Test
    @DisplayName("AuthTenantSwitchHandler.cambiarNegocio (:67) no loguea getMessage ni stack")
    void cambiarNegocio() {
        escuchar(AuthTenantSwitchHandler.class);
        AuthTenantSwitchHandler h = new AuthTenantSwitchHandler();
        AuthSupport authSupport = mock(AuthSupport.class);
        when(authSupport.usuarioFromRequest(any())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "authSupport", authSupport);

        var res = h.cambiarNegocio(Map.of("empresaId", 1), new MockHttpServletRequest(), new MockHttpServletResponse());

        assertThat(res.getStatusCode().value()).isEqualTo(500);
        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    @Test
    @DisplayName("AuthTenantSwitchHandler.seleccionarEmpresa (:133) no loguea getMessage ni stack")
    void seleccionarEmpresa() {
        escuchar(AuthTenantSwitchHandler.class);
        AuthTenantSwitchHandler h = new AuthTenantSwitchHandler();
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.isEmpresaSelectionToken(anyString())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "jwtUtil", jwt);

        var res = h.seleccionarEmpresa(Map.of("tempToken", "t", "empresaId", 1), new MockHttpServletResponse());

        assertThat(res.getStatusCode().value()).isEqualTo(401);
        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    @Test
    @DisplayName("AuthEmailOtpHandler.sendLoginEmailOtp (:51) no loguea getMessage")
    void emailOtpSend() {
        escuchar(AuthEmailOtpHandler.class);
        AuthEmailOtpHandler h = new AuthEmailOtpHandler();
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.isTempToken(anyString())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "jwtUtil", jwt);

        h.sendLoginEmailOtp(Map.of("tempToken", "t"), new MockHttpServletRequest());

        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    @Test
    @DisplayName("AuthEmailOtpHandler.enableEmailOtp (:67) no loguea getMessage ni stack")
    void emailOtpEnable() {
        escuchar(AuthEmailOtpHandler.class);
        AuthEmailOtpHandler h = new AuthEmailOtpHandler();
        AuthSupport authSupport = mock(AuthSupport.class);
        when(authSupport.usuarioFromRequest(any())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "authSupport", authSupport);

        h.enableEmailOtp(new MockHttpServletRequest());

        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    @Test
    @DisplayName("AuthTotpVerifyHandler.verify2FA (:135) no loguea getMessage")
    void totpVerify() {
        escuchar(AuthTotpVerifyHandler.class);
        AuthTotpVerifyHandler h = new AuthTotpVerifyHandler();
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.isTempToken(anyString())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "jwtUtil", jwt);

        var res = h.verify2FA(Map.of("tempToken", "t", "code", "123456"), new MockHttpServletRequest());

        assertThat(res.getStatusCode().value()).isEqualTo(401);
        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    @Test
    @DisplayName("AvisoReposicionService (:63) no loguea el mensaje del fallo de correo")
    void avisoReposicion() {
        escuchar(AvisoReposicionService.class);
        SuscripcionReposicionRepository suscripciones = mock(SuscripcionReposicionRepository.class);
        ProductoRepository productos = mock(ProductoRepository.class);
        ResendEmailService email = mock(ResendEmailService.class);
        ReposicionEmailBuilder plantilla = mock(ReposicionEmailBuilder.class);
        Producto p = new Producto();
        p.setId(7L);
        p.setStockActual(3);
        p.setStockReservado(0);
        when(productos.findById(7L)).thenReturn(Optional.of(p));
        SuscripcionReposicion sus = new SuscripcionReposicion();
        sus.setId(1L);
        sus.setCorreo(PII);
        when(suscripciones.findByProducto_IdAndNotificadoFalse(7L)).thenReturn(List.of(sus));
        when(suscripciones.reclamarParaAviso(eq(1L), any())).thenReturn(1);
        when(plantilla.asunto(any())).thenReturn("asunto");
        when(plantilla.html(any())).thenReturn("<html/>");
        doThrow(conPii()).when(email).send(any(), any(), any());

        new AvisoReposicionService(suscripciones, productos, email, plantilla).avisarSuscriptores(7L);

        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    @Test
    @DisplayName("VentaAvisoService (:34) no loguea el correo que viaja en el mensaje del fallo")
    void ventaAviso() {
        escuchar(VentaAvisoService.class);
        NotificacionEmailService notif = mock(NotificacionEmailService.class);
        ModeracionAdminAvisoService mod = mock(ModeracionAdminAvisoService.class);
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-FICT-1");
        Empresa e = new Empresa();
        e.setId(7L);
        pedido.setEmpresa(e);
        Usuario cliente = new Usuario();
        cliente.setCorreo(PII);
        pedido.setUsuarioFinal(cliente);
        doThrow(conPii()).when(notif).enviarConfirmacionPedido(pedido);

        new VentaAvisoService(notif, mod).avisarVentaConfirmada(pedido);

        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("ORD-FICT-1").contains("RuntimeException");
    }

    @Test
    @DisplayName("AltaEmprendedorNotificador (:36) no loguea el correo del alta")
    void altaEmprendedor() {
        escuchar(AltaEmprendedorNotificador.class);
        TelegramService tg = mock(TelegramService.class);
        NotificacionEmailService notif = mock(NotificacionEmailService.class);
        doThrow(conPii()).when(notif).enviarAltaEmprendedorAAdminIT(anyString(), anyString(),
            org.mockito.ArgumentMatchers.anyBoolean(), any());

        new AltaEmprendedorNotificador(tg, notif).notificar("Negocio Fict", PII,
            ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(3, 70)));

        assertLogLimpio(1);
        assertThat(appender.list.get(0).getFormattedMessage()).contains("RuntimeException");
    }

    private static HttpClientErrorException http(HttpStatus status, String cuerpo) {
        return HttpClientErrorException.create(status, status.getReasonPhrase(), HttpHeaders.EMPTY,
            cuerpo.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
    }

    private TelegramService telegram(RestTemplate rt) {
        TelegramService s = new TelegramService(rt);
        ReflectionTestUtils.setField(s, "botToken", "123456789:AAH-fake_token-for_tests");
        ReflectionTestUtils.setField(s, "chatId", "-100");
        return s;
    }

    @Test
    @DisplayName("TelegramService (:57) con un 4xx: loguea solo estado y clase, no el cuerpo")
    void telegram4xx() {
        escuchar(TelegramService.class);
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.postForObject(anyString(), any(), eq(String.class))).thenThrow(http(HttpStatus.BAD_REQUEST, CUERPO));

        telegram(rt).enviar("hola");

        assertLogLimpio(1);
        String msg = appender.list.get(appender.list.size() - 1).getFormattedMessage();
        assertThat(msg).contains("400").contains("BadRequest");
    }

    @Test
    @DisplayName("TelegramService (:64 y :69) con error de formato y reintento fallido: ni el cuerpo ni el reenvío lo loguean")
    void telegramFormatoYReintento() {
        escuchar(TelegramService.class);
        RestTemplate rt = mock(RestTemplate.class);
        String formato = "{\"description\":\"Bad Request: can't parse entities en " + PII + "\"}";
        when(rt.postForObject(anyString(), any(), eq(String.class)))
            .thenThrow(http(HttpStatus.BAD_REQUEST, formato))
            .thenThrow(http(HttpStatus.FORBIDDEN, CUERPO));

        telegram(rt).enviar("*hola*");

        assertLogLimpio(2);
        assertThat(appender.list).anySatisfy(ev -> assertThat(ev.getFormattedMessage()).contains("Markdown rechazado"));
        assertThat(appender.list).anySatisfy(ev ->
            assertThat(ev.getFormattedMessage()).contains("403").contains("Forbidden"));
    }
}
