package com.hotclick.service.telegram;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.controller.TelegramConfigController;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TelegramService;
import com.hotclick.sse.StockCambioEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Los logs de las clases de Telegram que atrapan excepciones de la base o de HTTP solo escriben el nombre de la
 * clase de la excepción: ni el mensaje (que puede traer {@code Detail: Key (cedula)=(...)} de Hibernate/PostgreSQL)
 * ni el throwable (cuyo mensaje de HTTP trae la URL con el token). Sin helpers nuevos en los asserts: corre igual
 * contra el código anterior. Datos ficticios.
 */
@DisplayName("Logs de Telegram: solo la clase de la excepción, nunca su mensaje")
class TelegramLogsSinMensajeDeExcepcionTest {

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

    @Test
    @DisplayName("TelegramService.enviar")
    void telegramService() {
        RestTemplate rt = mock(RestTemplate.class, inv -> { throw new IllegalStateException(DATO); });
        TelegramService s = new TelegramService(rt);
        ReflectionTestUtils.setField(s, "botToken", "123456789:AAFictTokenFictTokenFictToken");
        ReflectionTestUtils.setField(s, "chatId", "111");
        s.enviar("hola");
        sinElMensaje(1);
    }

    @Test
    @DisplayName("TelegramNotificacionClienteService: los 6 sitios")
    void notificaciones() {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        when(repo.findActivasPorEmpresa(anyLong())).thenThrow(new IllegalStateException(DATO));
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        when(bot.isConfigured()).thenReturn(true);
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), org.mockito.ArgumentMatchers.<Object>any())).thenThrow(new IllegalStateException(DATO));
        TelegramNotificacionClienteService s = new TelegramNotificacionClienteService();
        ReflectionTestUtils.setField(s, "vinculacionRepository", repo);
        ReflectionTestUtils.setField(s, "bot", bot);
        ReflectionTestUtils.setField(s, "rateLimiter", rl);
        ReflectionTestUtils.setField(s, "jdbc", jdbc);

        s.notificarVenta(1L, "P-1", 1000, "EFECTIVO", "Cliente", "POS", null);
        s.notificarSolicitudEnviada(1L, "Tu producto", "Item");
        s.notificarSolicitudAprobada(1L, "Tu producto", "Item");
        s.notificarSolicitudRevision(1L, "Tu producto", "Item", "ajustá");
        s.notificarProductoModerado(1L, "Item", true, "notas");
        StockCambioEvent ev = mock(StockCambioEvent.class);
        when(ev.getEmpresaId()).thenReturn(1L);
        when(ev.getProductoId()).thenReturn(5L);
        when(ev.getStockActual()).thenReturn(0);
        s.onStockCambio(ev);

        sinElMensaje(6);
    }

    @Test
    @DisplayName("TelegramConfigController.registrarWebhook")
    void configController() {
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        when(bot.isConfigured()).thenReturn(true);
        when(bot.isWebhookSecretValido()).thenReturn(true);
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.isAdminIT()).thenReturn(true);
        TelegramConfigService cfg = mock(TelegramConfigService.class);
        when(cfg.registrarWebhook()).thenThrow(new IllegalStateException(DATO));
        TelegramConfigController c = new TelegramConfigController();
        ReflectionTestUtils.setField(c, "bot", bot);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "telegramConfigService", cfg);
        c.registrarWebhook();
        sinElMensaje(1);
    }

    @Test
    @DisplayName("TelegramClienteBotService: sendChatAction y answerCallbackQuery")
    void clienteBot() {
        RestTemplate rt = mock(RestTemplate.class, inv -> { throw new IllegalStateException(DATO); });
        TelegramClienteBotService s = new TelegramClienteBotService();
        ReflectionTestUtils.setField(s, "botToken", "123456789:AAFictTokenFictTokenFictToken");
        ReflectionTestUtils.setField(s, "restTemplate", rt);
        s.enviarAccionEscribiendo(555L);
        s.responderCallback("cb-fict");
        sinElMensaje(2);
    }
}
