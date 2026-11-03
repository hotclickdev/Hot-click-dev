package com.hotclick.service.telegram;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.controller.TelegramBotWebhookController;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.scheduler.TelegramInventarioScheduler;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.AltaEmprendedorNotificador;
import com.hotclick.service.email.EncargoEmailSender;
import com.hotclick.service.EncargoService;
import com.hotclick.service.ModeracionAdminAvisoService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.TenantService;
import com.hotclick.service.VentaAvisoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BAJO 7 de Seguridad sobre #393: los logs de los avisos y del bot de Telegram escriben solo el nombre de la clase
 * de la excepción: ni su mensaje (aunque pase por sinToken o paraLog, que quitan el token pero no los datos personales
 * que traen los errores de la base o del proveedor). Los helpers {@code TelegramFlujo*} no mandan al chat el mensaje de
 * una excepción inesperada: mandan uno genérico, y conservan el de las excepciones de dominio controladas
 * ({@link PlanLimitException}). Sin helpers nuevos en los asserts: corre igual contra el código anterior. Datos ficticios.
 */
@DisplayName("Logs y avisos de Telegram: solo la clase de la excepción, nunca su mensaje")
class TelegramLogsYAvisosSoloClaseTest {

    private static final String DATO = "Key (cedula)=(9-9999-9999) ya existe; Failing row contains (persona.ficticia@ejemplo.test)";

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

    private String log() {
        return appender.list.stream().map(e -> e.getFormattedMessage()
                + (e.getThrowableProxy() != null ? " | " + e.getThrowableProxy().getMessage() : ""))
            .collect(Collectors.joining("\n"));
    }

    private void sinElMensaje(int minimoDeLineas) {
        assertThat(appender.list.size()).as("líneas de log").isGreaterThanOrEqualTo(minimoDeLineas);
        assertThat(log()).doesNotContain("9-9999-9999").doesNotContain("ejemplo.test").doesNotContain("Failing row")
            .contains("IllegalStateException");
    }

    private static Pedido pedido() {
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        empresa.setNombreComercial("Tienda Ficticia");
        Pedido p = new Pedido();
        p.setEmpresa(empresa);
        p.setNumeroPedido("P-1");
        return p;
    }

    @Test
    @DisplayName("TelegramClienteBotService.enviarMensaje (:117)")
    void clienteBotEnviarMensaje() {
        RestTemplate rt = mock(RestTemplate.class, inv -> { throw new IllegalStateException(DATO); });
        TelegramClienteBotService s = new TelegramClienteBotService();
        ReflectionTestUtils.setField(s, "botToken", "123456789:AAFictTokenFictTokenFictToken");
        ReflectionTestUtils.setField(s, "restTemplate", rt);
        s.enviarMensaje(555L, "hola", null);
        sinElMensaje(1);
    }

    @Test
    @DisplayName("TelegramClienteBotService.descargarArchivo (:255)")
    void clienteBotDescargarArchivo() {
        RestTemplate rt = mock(RestTemplate.class, inv -> { throw new IllegalStateException(DATO); });
        TelegramClienteBotService s = new TelegramClienteBotService();
        ReflectionTestUtils.setField(s, "botToken", "123456789:AAFictTokenFictTokenFictToken");
        ReflectionTestUtils.setField(s, "restTemplate", rt);
        assertThat(s.descargarArchivo("file-fict", 1000L)).isNull();
        sinElMensaje(1);
    }

    @Test
    @DisplayName("TelegramInventarioScheduler.enviarChequeoSemanal (:66)")
    void schedulerChequeo() {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        when(bot.isConfigured()).thenReturn(true);
        JdbcTemplate jdbc = mock(JdbcTemplate.class, inv -> { throw new IllegalStateException(DATO); });
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(555123456L);
        v.setEmpresaActivaId(3L);
        when(repo.findByEstadoAndChatIdIsNotNull(any())).thenReturn(List.of(v));
        new TelegramInventarioScheduler(repo, bot, jdbc).enviarChequeoSemanal();
        sinElMensaje(1);
    }

    @Test
    @DisplayName("TelegramBotWebhookController.recibirUpdate (:89)")
    void webhook() {
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        when(bot.validarSecret(any())).thenReturn(true);
        TelegramBotUpdateService updates = mock(TelegramBotUpdateService.class);
        doThrow(new IllegalStateException(DATO)).when(updates).procesarUpdate(any());
        TelegramBotWebhookController c = new TelegramBotWebhookController();
        ReflectionTestUtils.setField(c, "bot", bot);
        ReflectionTestUtils.setField(c, "updateService", updates);
        ReflectionTestUtils.setField(c, "clientIpResolver", mock(ClientIpResolver.class));
        ReflectionTestUtils.setField(c, "objectMapper", new ObjectMapper());
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setContent("{\"update_id\":1}".getBytes());
        assertThat(c.recibirUpdate("secreto-ficticio", req).getStatusCode().value()).isEqualTo(200);
        sinElMensaje(1);
    }

    @Test
    @DisplayName("VentaAvisoService.avisarVentaConfirmada, aviso a Telegram (:39)")
    void ventaAviso() {
        NotificacionEmailService email = mock(NotificacionEmailService.class);
        ModeracionAdminAvisoService admin = mock(ModeracionAdminAvisoService.class);
        doThrow(new IllegalStateException(DATO)).when(admin).avisarNuevaVenta(any());
        new VentaAvisoService(email, admin).avisarVentaConfirmada(pedido());
        sinElMensaje(1);
    }

    @Test
    @DisplayName("AltaEmprendedorNotificador.notificar, Telegram (:30)")
    void altaEmprendedor() {
        TelegramService tg = mock(TelegramService.class);
        doThrow(new IllegalStateException(DATO)).when(tg).enviar(anyString());
        new AltaEmprendedorNotificador(tg, mock(NotificacionEmailService.class))
            .notificar("Tienda Ficticia", "dueno.ficticio@ejemplo.test", new ResultadoAltaCupo(true, false, com.hotclick.dto.CupoEmprendedorEstado.of(1, 10)));
        // el log del correo del dueño no es parte de este caso: solo se mira la línea de Telegram
        assertThat(appender.list.stream().filter(e -> e.getFormattedMessage().contains("fallo Telegram"))
            .map(ILoggingEvent::getFormattedMessage).collect(Collectors.joining("\n")))
            .doesNotContain("9-9999-9999").doesNotContain("Failing row").contains("IllegalStateException");
    }

    @Test
    @DisplayName("ModeracionAdminAvisoService.enviar (:69)")
    void moderacionAdmin() {
        TelegramService tg = mock(TelegramService.class);
        doThrow(new IllegalStateException(DATO)).when(tg).enviar(anyString());
        new ModeracionAdminAvisoService(tg).avisarEmpresaPendiente(3L, "Tienda Ficticia");
        sinElMensaje(1);
    }

    @Test
    @DisplayName("EncargoService.notificarNuevo, Telegram (:450)")
    void encargo() {
        EncargoService s = new EncargoService();
        TelegramNotificacionClienteService notif = mock(TelegramNotificacionClienteService.class);
        doThrow(new IllegalStateException(DATO)).when(notif).notificarSolicitudEnviada(anyLong(), anyString(), any());
        ReflectionTestUtils.setField(s, "emailSender", mock(EncargoEmailSender.class));
        ReflectionTestUtils.setField(s, "telegramNotif", notif);
        Empresa empresa = new Empresa();
        empresa.setId(3L);
        empresa.setNombreEmpresa("Tienda Ficticia");
        empresa.setCorreoEmpresa("tienda.ficticia@ejemplo.test");
        EncargoPersonalizado e = new EncargoPersonalizado();
        e.setEmpresa(empresa);
        ReflectionTestUtils.invokeMethod(s, "notificarNuevo", e);
        // el log trae solo la clase: "ejemplo.test" no puede aparecer de la excepción
        assertThat(log()).doesNotContain("9-9999-9999").doesNotContain("Failing row").contains("IllegalStateException");
    }

    // ── helpers TelegramFlujo*: lo que se manda al chat ─────────────────────────────

    private TelegramFlujoProductoCallbackHelper helper(TenantService tenant, TelegramClienteBotService bot) {
        TelegramFlujoSupport support = mock(TelegramFlujoSupport.class);
        BodegaRepository bodegas = mock(BodegaRepository.class);
        when(bodegas.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(anyLong(), org.mockito.ArgumentMatchers.anyInt()))
            .thenReturn(List.of(new Bodega()));
        TelegramFlujoProductoCallbackHelper h = new TelegramFlujoProductoCallbackHelper();
        ReflectionTestUtils.setField(h, "support", support);
        ReflectionTestUtils.setField(h, "bot", bot);
        ReflectionTestUtils.setField(h, "bodegaRepository", bodegas);
        ReflectionTestUtils.setField(h, "tenantService", tenant);
        return h;
    }

    private static String textoEnviado(TelegramClienteBotService bot) {
        org.mockito.ArgumentCaptor<String> txt = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(bot).enviarMensaje(anyLong(), txt.capture(), anyList());
        return txt.getValue();
    }

    @Test
    @DisplayName("Nuevo producto: un error inesperado al verificar el límite manda un mensaje genérico al chat")
    void helperErrorInesperadoMensajeGenerico() {
        TenantService tenant = mock(TenantService.class);
        doThrow(new IllegalStateException(DATO)).when(tenant).verificarLimiteProductos(3L);
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(555123456L);
        assertThat(helper(tenant, bot).manejarNuevo(v, 3L)).isTrue();
        assertThat(textoEnviado(bot)).doesNotContain("9-9999-9999").doesNotContain("ejemplo.test").doesNotContain("Failing row");
        assertThat(log()).doesNotContain("9-9999-9999").doesNotContain("Failing row");
    }

    @Test
    @DisplayName("control: el límite del plan (excepción de dominio) sí le llega al usuario")
    void helperLimiteDelPlanSeConserva() {
        TenantService tenant = mock(TenantService.class);
        doThrow(new PlanLimitException("Alcanzaste el límite de productos de tu plan")).when(tenant).verificarLimiteProductos(3L);
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(555123456L);
        assertThat(helper(tenant, bot).manejarNuevo(v, 3L)).isTrue();
        assertThat(textoEnviado(bot)).contains("límite de productos");
    }
}
