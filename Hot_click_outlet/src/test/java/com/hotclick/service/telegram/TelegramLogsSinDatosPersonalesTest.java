package com.hotclick.service.telegram;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.controller.TelegramBotWebhookController;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.scheduler.TelegramInventarioScheduler;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.ReflectionUtils;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Datos personales fuera de los logs del bot de Telegram (BAJOS de Seguridad sobre #382):
 * chat_id enmascarado ***NNNN, sin callback_data ni file_path, mensajes de excepción ajenos
 * truncados (y sin saltos de línea) y la excepción completa solo en el log del servidor.
 * Datos ficticios. Los asserts no usan helpers nuevos: el mismo test corre contra el código viejo.
 */
class TelegramLogsSinDatosPersonalesTest {

    static final long CHAT = 987654321L;
    static final String CHAT_ENMASCARADO = "***4321";
    static final String TOKEN_FICT = "123456789:AAFictTokenFictTokenFictToken";
    static final String CALLBACK_FICT = "zz:callback-fict-secreto";
    static final String RUTA_FICT = "documents/ruta-fict-privada.jpg";
    static final String COLA = "COLA-DEL-MENSAJE-FICT";
    /** Mensaje de excepción ajeno de más de 400 caracteres: la cola nunca debe llegar al log. */
    static final String MENSAJE_LARGO = "inicio-del-mensaje " + "x".repeat(400) + COLA;

    private ListAppender<ILoggingEvent> appender;
    private Logger raiz;
    private Level nivelOriginal;

    @BeforeEach
    void capturar() {
        raiz = (Logger) org.slf4j.LoggerFactory.getLogger("com.hotclick");
        nivelOriginal = raiz.getLevel();
        raiz.setLevel(Level.DEBUG);
        appender = new ListAppender<>();
        appender.start();
        raiz.addAppender(appender);
    }

    @AfterEach
    void soltar() {
        raiz.detachAppender(appender);
        raiz.setLevel(nivelOriginal);
    }

    /** Todo lo que el log escribiría: mensaje formateado + excepción (clase, mensaje). */
    private String todoElLog() {
        return appender.list.stream().map(e -> e.getFormattedMessage()
            + (e.getThrowableProxy() != null ? " | " + e.getThrowableProxy().getClassName()
                + ": " + e.getThrowableProxy().getMessage() : ""))
            .collect(Collectors.joining("\n"));
    }

    /** Solo los mensajes formateados (sin la excepción adjunta). */
    private String soloMensajes() {
        return appender.list.stream().map(ILoggingEvent::getFormattedMessage).collect(Collectors.joining("\n"));
    }

    private static void set(Object target, String campo, Object valor) {
        if (ReflectionUtils.findField(target.getClass(), campo) != null) {
            ReflectionTestUtils.setField(target, campo, valor);
        }
    }

    // ═══ (1) webhook: el mensaje de la excepción va truncado ═══════════════════════════

    @Test
    void webhook_errorDeProcesamiento_soloLaClase_sinMensaje_sinSaltosDeLinea_sinToken() throws Exception {
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        TelegramBotUpdateService updateService = mock(TelegramBotUpdateService.class);
        when(bot.validarSecret("bueno")).thenReturn(true);
        doThrow(new IllegalStateException("linea1\nlinea-falsa-inyectada bot" + TOKEN_FICT + " " + MENSAJE_LARGO))
            .when(updateService).procesarUpdate(any());

        TelegramBotWebhookController c = new TelegramBotWebhookController();
        set(c, "bot", bot);
        set(c, "updateService", updateService);
        set(c, "abuso", mock(TelegramAbusoService.class));
        set(c, "clientIpResolver", mock(ClientIpResolver.class));
        set(c, "objectMapper", new ObjectMapper());
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/webhooks/telegram");
        req.setContent("{\"update_id\":1}".getBytes(StandardCharsets.UTF_8));

        assertThat(c.recibirUpdate("bueno", req).getStatusCode().value()).isEqualTo(200);

        // BAJO 7 de Seguridad: del error del webhook se registra solo la clase, nunca su mensaje (ni truncado).
        assertThat(todoElLog()).contains("IllegalStateException").doesNotContain("inicio-del-mensaje")
            .doesNotContain("linea-falsa-inyectada").doesNotContain(COLA).doesNotContain("AAFictToken").doesNotContain("linea-falsa-inyectada\n");
        assertThat(soloMensajes()).doesNotContain("\nlinea-falsa");
        assertThat(soloMensajes().length()).as("línea de log acotada").isLessThan(400);
    }

    // ═══ (2) chat_id enmascarado + (3) excepción completa solo en el log del servidor ═══

    private static TelegramVinculacion vinculacion() {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(CHAT);
        return v;
    }

    @Test
    void confirmarAccion_conExcepcion_chatEnmascarado_excepcionCompletaSoloEnElLog_yAlUsuarioGenerico() throws Exception {
        TelegramFlujoSupport support = mock(TelegramFlujoSupport.class);
        TelegramFlujoService flujo = mock(TelegramFlujoService.class);
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        PedidoRepository pedidos = mock(PedidoRepository.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        TelegramFlujoAccionHandler h = new TelegramFlujoAccionHandler();
        set(h, "support", support);
        set(h, "flujo", flujo);
        set(h, "bot", bot);
        set(h, "pedidoRepository", pedidos);
        set(h, "objectMapper", mapper);
        Empresa empresa = new Empresa();
        empresa.setId(9L);
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        when(pedidos.findById(33L)).thenReturn(Optional.of(pedido));
        when(support.ahora()).thenReturn(LocalDateTime.now(Constants.ZONA_CR));
        when(flujo.cambiarEstadoPedidoTx(anyLong(), any(), any()))
            .thenThrow(new IllegalStateException("fallo-fict " + COLA));
        TelegramVinculacion v = vinculacion();
        v.setContexto(TelegramFlujoEstado.nuevaAccion(LocalDateTime.now(Constants.ZONA_CR),
            AccionPropuestaTelegram.PEDIDO_ESTADO, 33L, Map.of("nuevoEstado", "ENTREGADO"), "Resumen").serializar(mapper));

        h.callback(v, 9L, "ok");

        assertThat(soloMensajes()).contains(CHAT_ENMASCARADO).doesNotContain(String.valueOf(CHAT));
        assertThat(todoElLog()).doesNotContain(String.valueOf(CHAT));
        ILoggingEvent ev = appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).findFirst().orElseThrow();
        assertThat(ev.getThrowableProxy()).as("excepción completa en el log del servidor").isNotNull();
        assertThat(ev.getThrowableProxy().getMessage()).contains("IllegalStateException")
            .doesNotContain(COLA).doesNotContain("fallo-fict");
        assertThat(ev.getThrowableProxy().getCause()).as("sin cadena de causas").isNull();
        assertThat(ev.getThrowableProxy().getStackTraceElementProxyArray()).isNotEmpty();
        // nunca al usuario
        var mensajes = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(bot, atLeastOnce()).enviarMensaje(eq(CHAT), mensajes.capture());
        assertThat(String.join("\n", mensajes.getAllValues())).doesNotContain(COLA).doesNotContain("fallo-fict")
            .contains("No pude aplicar el cambio");
    }

    @Test
    void crossSell_conExcepcion_chatEnmascarado_yExcepcionCompleta() {
        AiCopilotService ia = mock(AiCopilotService.class);
        when(ia.crossSellCliente(anyLong(), anyLong())).thenThrow(new IllegalStateException(COLA));
        TelegramFlujoClientesHandler h = new TelegramFlujoClientesHandler();
        set(h, "aiCopilotService", ia);
        set(h, "bot", mock(TelegramClienteBotService.class));

        h.ejecutarCrossSell(CHAT, 9L, 5L);

        assertThat(todoElLog().replace(COLA, "")).doesNotContain(String.valueOf(CHAT));
        assertThat(soloMensajes()).contains(CHAT_ENMASCARADO);
        ILoggingEvent ev = appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).findFirst().orElseThrow();
        assertThat(ev.getThrowableProxy()).isNotNull();
        assertThat(ev.getThrowableProxy().getMessage()).contains("IllegalStateException").doesNotContain(COLA);
    }

    @Test
    void subirFoto_conExcepcion_chatEnmascarado_yExcepcionCompleta() throws Exception {
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        SupabaseStorageService storage = mock(SupabaseStorageService.class);
        when(bot.descargarArchivo(eq("file-fict"), anyLong())).thenReturn(new byte[] {1, 2, 3});
        when(storage.subirImagenDescargada(any(), anyString(), anyString(), anyString()))
            .thenThrow(new IOException(COLA));
        TelegramFlujoProductoFotoHelper h = new TelegramFlujoProductoFotoHelper();
        set(h, "bot", bot);
        set(h, "storageService", storage);
        set(h, "support", mock(TelegramFlujoSupport.class));

        h.subirFotoAlBorrador(vinculacion(), TelegramFlujoEstado.nuevoProducto(LocalDateTime.now(Constants.ZONA_CR)), "file-fict");

        assertThat(todoElLog().replace(COLA, "")).doesNotContain(String.valueOf(CHAT));
        assertThat(soloMensajes()).contains(CHAT_ENMASCARADO);
        ILoggingEvent ev = appender.list.stream().filter(e -> e.getLevel() == Level.ERROR).findFirst().orElseThrow();
        assertThat(ev.getThrowableProxy()).isNotNull();
    }

    @Test
    void chequeoSemanal_conError_chatEnmascarado_mensajeTruncado() {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(bot.isConfigured()).thenReturn(true);
        TelegramVinculacion v = vinculacion();
        v.setEmpresaActivaId(9L);
        when(repo.findByEstadoAndChatIdIsNotNull(TelegramVinculacion.ACTIVA)).thenReturn(List.of(v));
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenThrow(new IllegalStateException(MENSAJE_LARGO));
        when(jdbc.queryForList(anyString())).thenThrow(new IllegalStateException(MENSAJE_LARGO));

        new TelegramInventarioScheduler(repo, bot, jdbc).enviarChequeoSemanal();

        assertThat(todoElLog()).doesNotContain(String.valueOf(CHAT)).doesNotContain(COLA);
        assertThat(soloMensajes()).contains(CHAT_ENMASCARADO);
    }

    // ═══ (4) callback_data y file_path fuera de los logs ═══════════════════════════════

    @Test
    void callbackDesconocido_noRegistraElCallback_yEnmascaraElChat() throws Exception {
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        TelegramRateLimitService rateLimit = mock(TelegramRateLimitService.class);
        TelegramVinculacionService vinculacionSvc = mock(TelegramVinculacionService.class);
        TelegramAbusoService abuso = mock(TelegramAbusoService.class);
        TelegramVinculacion v = vinculacion();
        when(rateLimit.permitidoPorRateLimit(CHAT)).thenReturn(true);
        when(vinculacionSvc.vinculacionActiva(CHAT)).thenReturn(Optional.of(v));
        TelegramCallbackHandler handler = new TelegramCallbackHandler();
        set(handler, "bot", bot);
        set(handler, "rateLimit", rateLimit);
        set(handler, "vinculacion", vinculacionSvc);
        set(handler, "abuso", abuso);
        set(handler, "vinculacionRepository", mock(TelegramVinculacionRepository.class));
        JsonNode cb = new ObjectMapper().readTree("{\"id\":\"c1\",\"data\":\"" + CALLBACK_FICT
            + "\",\"message\":{\"message_id\":5,\"chat\":{\"id\":" + CHAT + "}}}");

        try {
            handler.procesarCallback(cb);
        } finally {
            TelegramTurno.cerrarYTomarSiDirty();
        }

        assertThat(appender.list).as("el callback desconocido sí se registra").isNotEmpty();
        assertThat(todoElLog()).doesNotContain(CALLBACK_FICT).doesNotContain("callback-fict")
            .doesNotContain(String.valueOf(CHAT)).contains(CHAT_ENMASCARADO);
    }

    private static RestTemplate restTemplateDe(TelegramClienteBotService bot, String campo) {
        return (RestTemplate) ReflectionTestUtils.getField(bot, campo);
    }

    @Test
    void descargarArchivo_filePathSospechoso_noRegistraLaRuta() {
        TelegramClienteBotService bot = new TelegramClienteBotService();
        ReflectionTestUtils.setField(bot, "botToken", TOKEN_FICT);
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplateDe(bot, "restTemplate")).build();
        server.expect(method(HttpMethod.POST)).andRespond(withSuccess(
            "{\"ok\":true,\"result\":{\"file_size\":10,\"file_path\":\"../" + RUTA_FICT + "\"}}",
            org.springframework.http.MediaType.APPLICATION_JSON));

        assertThat(bot.descargarArchivo("file-fict", 1000)).isNull();

        assertThat(appender.list).as("el archivo sospechoso sí se registra").isNotEmpty();
        assertThat(todoElLog()).doesNotContain(RUTA_FICT).doesNotContain("ruta-fict").doesNotContain(TOKEN_FICT);
    }

    @Test
    void enviarMensaje_conErrorHttp_chatEnmascarado_mensajeTruncado_sinToken() {
        TelegramClienteBotService bot = new TelegramClienteBotService();
        ReflectionTestUtils.setField(bot, "botToken", TOKEN_FICT);
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplateDe(bot, "restTemplate")).build();
        server.expect(org.springframework.test.web.client.ExpectedCount.manyTimes(), requestTo(org.hamcrest.Matchers.startsWith("https://api.telegram.org/bot")))
            .andRespond(withServerError().body(MENSAJE_LARGO));

        bot.enviarMensaje(CHAT, "hola ficticio");

        assertThat(appender.list).isNotEmpty();
        assertThat(todoElLog()).doesNotContain(String.valueOf(CHAT)).doesNotContain(COLA)
            .doesNotContain("AAFictToken").contains(CHAT_ENMASCARADO);
    }

    // ═══ Guardia estática: ninguna línea de log del bot lleva el chatId sin enmascarar ═══

    @Test
    void ningunLogDelBotLlevaElChatIdSinEnmascarar() throws IOException {
        Path base = Path.of("src/main/java");
        Pattern llamadaLog = Pattern.compile("\\blog\\.(trace|debug|info|warn|error)\\((.*?)\\);", Pattern.DOTALL);
        Pattern chat = Pattern.compile("(?i)\\bchat_?id\\b|getChatId\\(\\)|\\bchatId\\b");
        List<String> infracciones;
        try (Stream<Path> archivos = Files.walk(base)) {
            infracciones = archivos
                .filter(p -> p.getFileName().toString().matches("Telegram.*\\.java"))
                .flatMap(p -> {
                    try {
                        String fuente = Files.readString(p);
                        Matcher m = llamadaLog.matcher(fuente);
                        java.util.ArrayList<String> r = new java.util.ArrayList<>();
                        while (m.find()) {
                            String args = m.group(2);
                            if (chat.matcher(args).find() && !args.contains("chatEnmascarado")) {
                                r.add(p.getFileName() + ": " + args.replaceAll("\\s+", " "));
                            }
                        }
                        return r.stream();
                    } catch (IOException e) {
                        throw new java.io.UncheckedIOException(e);
                    }
                }).toList();
        }
        assertThat(infracciones).as("logs con chat_id sin enmascarar").isEmpty();
    }

    @Test
    void ningunLogDelBotLlevaCallbackDataNiFilePath() throws IOException {
        Path base = Path.of("src/main/java");
        Pattern llamadaLog = Pattern.compile("\\blog\\.(trace|debug|info|warn|error)\\((.*?)\\);", Pattern.DOTALL);
        Pattern prohibido = Pattern.compile("\\bdata\\b|callback_data|\\bfilePath\\b");
        List<String> infracciones;
        try (Stream<Path> archivos = Files.walk(base)) {
            infracciones = archivos
                .filter(p -> p.getFileName().toString().matches("Telegram.*\\.java"))
                .flatMap(p -> {
                    try {
                        Matcher m = llamadaLog.matcher(Files.readString(p));
                        java.util.ArrayList<String> r = new java.util.ArrayList<>();
                        while (m.find()) {
                            // se mira lo que se pasa como argumento, no el texto fijo del mensaje
                            String sinLiterales = m.group(2).replaceAll("\"([^\"\\\\]|\\\\.)*\"", "\"\"");
                            if (prohibido.matcher(sinLiterales).find()) {
                                r.add(p.getFileName() + ": " + m.group(2).replaceAll("\\s+", " "));
                            }
                        }
                        return r.stream();
                    } catch (IOException e) {
                        throw new java.io.UncheckedIOException(e);
                    }
                }).toList();
        }
        assertThat(infracciones).as("logs con callback_data o file_path").isEmpty();
    }
}
