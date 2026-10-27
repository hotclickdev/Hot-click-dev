package com.hotclick.controller;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.telegram.TelegramAbusoService;
import com.hotclick.service.telegram.TelegramDatosQueryService;
import com.hotclick.service.telegram.TelegramEmpresaContextService;
import com.hotclick.service.telegram.TelegramFlujoAccionHandler;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import com.hotclick.utils.Constants;
import jakarta.servlet.ReadListener;
import jakarta.servlet.Filter;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.util.ReflectionUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Auditor 8, MEDIOS sobre master 25b415d9:
 * M-A desbloqueo admin del bloqueo de 365 días, M-B secret antes de parsear + tope real de body,
 * M-C sin ex.getMessage() al usuario ni datos del negocio en logs/alertas.
 * Datos ficticios.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TelegramMediosAuditor8Test {

    /** Texto que simula datos del negocio dentro del mensaje de una excepción. */
    static final String DATO_NEGOCIO = "Joyeria Ficticia La Perla, factura FICT-0001, tabla hot_click_producto_tb";

    @Mock RateLimiter rateLimiter;
    @Mock TelegramService telegramService;

    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    @AfterEach void quitarAppender() { if (logger != null) logger.detachAppender(appender); }

    private void capturar(Class<?> c) {
        logger = (Logger) LoggerFactory.getLogger(c);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    private String logs() {
        return appender.list.stream().map(e -> e.getFormattedMessage()
            + (e.getThrowableProxy() != null ? e.getThrowableProxy().getMessage() : ""))
            .collect(Collectors.joining("\n"));
    }

    /** Asigna el campo solo si existe (el mismo test se corre contra el código viejo). */
    private static void set(Object target, String campo, Object valor) {
        if (ReflectionUtils.findField(target.getClass(), campo) != null) {
            ReflectionTestUtils.setField(target, campo, valor);
        }
    }

    // ═══ M-A · desbloqueo administrativo ═══════════════════════════════════════════════

    private static final String URL_DESBLOQUEO = "/api/telegram/admin/desbloquear/5";

    private MockMvc mvcDesbloqueo(boolean admin, TelegramVinculacionRepository repo, AuditoriaAdminRegistroService auditoria) {
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.isAdminIT()).thenReturn(admin);
        TelegramAbusoService svc = new TelegramAbusoService();
        set(svc, "vinculacionRepository", repo);
        set(svc, "auditoria", auditoria);
        TelegramConfigController c = new TelegramConfigController();
        set(c, "companyScope", scope);
        set(c, "abusoService", svc);
        set(c, "bot", mock(TelegramClienteBotService.class));
        return MockMvcBuilders.standaloneSetup(c).build();
    }

    private static TelegramVinculacion vinculacionBloqueada() {
        Usuario u = new Usuario();
        u.setId(5L);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(777L);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setPausadoHasta(LocalDateTime.now(Constants.ZONA_CR).plusDays(364));
        return v;
    }

    @Test
    void desbloquear_admin_limpiaLaPausaYQuedaAuditado() throws Exception {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
        TelegramVinculacion v = vinculacionBloqueada();
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.of(v));

        mvcDesbloqueo(true, repo, auditoria).perform(post(URL_DESBLOQUEO)).andExpect(status().isOk());

        assertThat(v.getPausadoHasta()).isNull();
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        verify(repo).save(v);
        verify(auditoria).registrar(eq("TELEGRAM_DESBLOQUEO"), eq("TELEGRAM_VINCULACION"), any(), any(), anyString());
    }

    @Test
    void desbloquear_noAdmin_403_sinTocarNadaNiAuditar() throws Exception {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
        TelegramVinculacion v = vinculacionBloqueada();
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.of(v));

        mvcDesbloqueo(false, repo, auditoria).perform(post(URL_DESBLOQUEO)).andExpect(status().isForbidden());

        assertThat(v.getPausadoHasta()).isNotNull();
        verify(repo, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    void desbloquear_sinBloqueoVigente_noEscribeNiAudita() throws Exception {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
        TelegramVinculacion v = vinculacionBloqueada();
        v.setPausadoHasta(LocalDateTime.now(Constants.ZONA_CR).minusDays(1)); // pausa ya vencida
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.of(v));

        mvcDesbloqueo(true, repo, auditoria).perform(post(URL_DESBLOQUEO)).andExpect(status().isOk());

        verify(repo, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    // ═══ M-B · webhook: secret antes del body, con tope real ═══════════════════════════

    @Mock TelegramClienteBotService bot;
    @Mock TelegramBotUpdateService updateService;
    @Mock TelegramAbusoService abusoMock;
    @Mock ClientIpResolver ipResolver;

    private TelegramBotWebhookController webhookController() {
        TelegramBotWebhookController c = new TelegramBotWebhookController();
        set(c, "bot", bot);
        set(c, "updateService", updateService);
        set(c, "abuso", abusoMock);
        set(c, "clientIpResolver", ipResolver);
        set(c, "objectMapper", new ObjectMapper());
        when(bot.validarSecret("bueno")).thenReturn(true);
        return c;
    }

    private MockMvc mvcWebhook() {
        return MockMvcBuilders.standaloneSetup(webhookController()).build();
    }

    /** Request «chunked»: sin Content-Length, body generado al vuelo y contando los bytes que alguien lee. */
    static final class RequestChunked extends HttpServletRequestWrapper {
        final AtomicLong leidos = new AtomicLong();
        private final long total;

        RequestChunked(HttpServletRequest r, long total) { super(r); this.total = total; }

        @Override public long getContentLengthLong() { return -1; }
        @Override public int getContentLength() { return -1; }

        @Override public ServletInputStream getInputStream() {
            final byte[] inicio = "{\"update_id\":1,\"pad\":\"".getBytes(StandardCharsets.UTF_8);
            return new ServletInputStream() {
                long pos = 0;
                @Override public int read() {
                    if (pos >= total) return -1;
                    leidos.incrementAndGet();
                    int b = pos < inicio.length ? inicio[(int) pos] : 'a';
                    pos++;
                    return b;
                }
                @Override public boolean isFinished() { return pos >= total; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener l) { }
            };
        }
    }

    /** POST con body chunked de {@code total} bytes (un filtro envuelve el request); deja el wrapper en {@code salida}. */
    private MockMvc mvcWebhookChunked(long total, RequestChunked[] salida) {
        TelegramBotWebhookController c = webhookController();
        return MockMvcBuilders.standaloneSetup(c)
            .addFilters((Filter) (req, res, chain) ->
                chain.doFilter(salida[0] = new RequestChunked((HttpServletRequest) req, total), res))
            .build();
    }

    private MockHttpServletRequestBuilder postChunked(String secret) {
        return post("/api/webhooks/telegram")
            .header("X-Telegram-Bot-Api-Secret-Token", secret).contentType(MediaType.APPLICATION_JSON);
    }

    @Test
    void webhook_secretInvalido_conBodyNoJson_es403_noEs400_yCuentaElAbuso() throws Exception {
        mvcWebhook().perform(post("/api/webhooks/telegram")
                .header("X-Telegram-Bot-Api-Secret-Token", "malo")
                .contentType(MediaType.APPLICATION_JSON).content("esto no es json {{{"))
            .andExpect(status().isForbidden());
        verify(abusoMock).secretoInvalido(any());
        verifyNoInteractions(updateService);
    }

    @Test
    void webhook_secretInvalido_conBodyChunkedEnorme_403_sinLeerNiUnByte() throws Exception {
        RequestChunked[] req = new RequestChunked[1];
        mvcWebhookChunked(20L * 1024 * 1024, req).perform(postChunked("malo")).andExpect(status().isForbidden());
        assertThat(req[0].leidos.get()).as("bytes leídos antes de validar el secret").isZero();
        verifyNoInteractions(updateService);
    }

    @Test
    void webhook_secretValido_bodyChunkedMayorAlTope_413_yLeeComoMuchoElTopeMasUno() throws Exception {
        RequestChunked[] req = new RequestChunked[1];
        mvcWebhookChunked(20L * 1024 * 1024, req).perform(postChunked("bueno")).andExpect(status().isPayloadTooLarge());
        assertThat(req[0].leidos.get()).isLessThanOrEqualTo(64L * 1024 + 1);
        verifyNoInteractions(updateService);
    }

    @Test
    void webhook_secretValido_bodyNoJson_400_sinProcesar() throws Exception {
        mvcWebhook().perform(post("/api/webhooks/telegram")
                .header("X-Telegram-Bot-Api-Secret-Token", "bueno")
                .contentType(MediaType.APPLICATION_JSON).content("esto no es json {{{"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(updateService);
    }

    @Test
    void webhook_secretValido_updateNormal_200_yProcesa() throws Exception {
        mvcWebhook().perform(post("/api/webhooks/telegram")
                .header("X-Telegram-Bot-Api-Secret-Token", "bueno")
                .contentType(MediaType.APPLICATION_JSON).content("{\"update_id\":7}"))
            .andExpect(status().isOk());
        verify(updateService).procesarUpdate(argThat(n -> n.get("update_id").asInt() == 7));
    }

    // ═══ M-C · sin mensajes de excepción hacia el usuario, el log ni las alertas ═══════

    @Test
    void confirmarAccion_conExcepcion_alUsuarioMensajeGenerico_yNadaDelNegocioEnLogNiAlerta() throws Exception {
        capturar(TelegramFlujoAccionHandler.class);
        TelegramFlujoSupport support = mock(TelegramFlujoSupport.class);
        TelegramFlujoService flujo = mock(TelegramFlujoService.class);
        TelegramClienteBotService botLocal = mock(TelegramClienteBotService.class);
        PedidoRepository pedidos = mock(PedidoRepository.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

        TelegramFlujoAccionHandler h = new TelegramFlujoAccionHandler();
        set(h, "support", support);
        set(h, "flujo", flujo);
        set(h, "bot", botLocal);
        set(h, "pedidoRepository", pedidos);
        set(h, "objectMapper", mapper);

        Empresa empresa = new Empresa();
        empresa.setId(9L);
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        when(pedidos.findById(33L)).thenReturn(Optional.of(pedido));
        when(support.ahora()).thenReturn(LocalDateTime.now(Constants.ZONA_CR));
        when(flujo.cambiarEstadoPedidoTx(anyLong(), any(), any()))
            .thenThrow(new IllegalStateException("No se pudo guardar: " + DATO_NEGOCIO));

        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(4242L);
        v.setContexto(TelegramFlujoEstado.nuevaAccion(LocalDateTime.now(Constants.ZONA_CR),
            AccionPropuestaTelegram.PEDIDO_ESTADO, 33L, Map.of("nuevoEstado", "ENTREGADO"), "Resumen").serializar(mapper));

        h.callback(v, 9L, "ok");

        var mensajes = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(botLocal, atLeastOnce()).enviarMensaje(eq(4242L), mensajes.capture());
        assertThat(String.join("\n", mensajes.getAllValues()))
            .contains("No pude aplicar el cambio")
            .doesNotContain("Joyeria").doesNotContain("FICT-0001").doesNotContain("hot_click_producto_tb");
        assertThat(logs()).contains("IllegalStateException")
            .doesNotContain("Joyeria").doesNotContain("FICT-0001").doesNotContain("hot_click_producto_tb");
    }

    @Test
    void errorDeConsulta_laAlertaInternaNoLlevaDatosDelNegocio() {
        TelegramAbusoService abuso = new TelegramAbusoService();
        when(rateLimiter.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        set(abuso, "rateLimiter", rateLimiter);
        set(abuso, "telegramService", telegramService);
        TelegramEmpresaContextService ctx = mock(TelegramEmpresaContextService.class);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(4242L);
        when(ctx.empresaValidada(v)).thenReturn(9L);

        TelegramDatosQueryService q = new TelegramDatosQueryService();
        set(q, "bot", mock(TelegramClienteBotService.class));
        set(q, "empresaContext", ctx);
        set(q, "abuso", abuso);

        q.responderConDatos(v, empresaId -> { throw new IllegalStateException("fallo leyendo " + DATO_NEGOCIO); });

        verify(telegramService).enviar(argThat(s -> s.contains("IllegalStateException")
            && !s.contains("Joyeria") && !s.contains("FICT-0001") && !s.contains("hot_click_producto_tb")));
    }
}
