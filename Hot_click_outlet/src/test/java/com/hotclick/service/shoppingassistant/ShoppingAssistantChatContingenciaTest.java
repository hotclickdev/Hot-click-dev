package com.hotclick.service.shoppingassistant;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.model.Empresa;
import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.classifier.QueryClassification;
import com.hotclick.rag.classifier.QueryClassifier;
import com.hotclick.rag.controller.ShoppingAssistantController;
import com.hotclick.rag.controller.shoppingassistant.ShoppingAssistantImageSearchHandler;
import com.hotclick.rag.controller.shoppingassistant.ShoppingAssistantTenantGuard;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.pipeline.RagPipeline;
import com.hotclick.rag.pipeline.RagResult;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.customermemory.CustomerMemoryDto;
import com.hotclick.service.customermemory.CustomerMemoryService;
import com.hotclick.utils.InputSanitizer;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.slf4j.LoggerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** ALTO-2: fallos fuera del circuit breaker deben dar contingencia 200, nunca 500. */
class ShoppingAssistantChatContingenciaTest {

    private final RagPipeline pipeline = mock(RagPipeline.class);
    private final InputSanitizer sanitizer = mock(InputSanitizer.class);
    private final CustomerMemoryService memoria = mock(CustomerMemoryService.class);
    private final QueryClassifier classifier = mock(QueryClassifier.class);
    private final ShoppingAssistantSessionHelper sesiones = mock(ShoppingAssistantSessionHelper.class);
    private final ShoppingAssistantPersistence persistencia = mock(ShoppingAssistantPersistence.class);
    private ShoppingAssistantService service;
    private final ShoppingAssistantSesionFirma firma = ShoppingAssistantCuotaTest.firmaTest();
    private final UUID sesion = UUID.randomUUID();
    private final RagResult ok = new RagResult("respuesta ok", List.of(), List.of(), List.of(), 0, 0);

    @BeforeEach
    void setUp() {
        when(sanitizer.cleanWithLimit(anyString(), anyInt())).thenAnswer(i -> i.getArgument(0));
        when(classifier.classify(anyString(), any())).thenReturn(QueryClassification.PRODUCTO);
        when(sesiones.resolveSession(any(), anyLong())).thenReturn(sesion);
        when(sesiones.loadHistory(any())).thenReturn(List.of());
        when(memoria.getOrCreate(any())).thenReturn(CustomerMemoryDto.empty(null));
        when(pipeline.ejecutar(anyString(), anyLong(), any(), any(), any(), any(), anyBoolean(), any())).thenReturn(ok);
        service = new ShoppingAssistantService(pipeline, mock(AiQuotaService.class), sanitizer, memoria,
            classifier, mock(AssistantMetricsService.class), sesiones, persistencia,
            mock(ShoppingAssistantFeedbackHandler.class), ShoppingAssistantCuotaTest.cuotaLibre(), firma);
    }

    private ChatResponse chat() {
        return service.chat(1L, "Tienda", "Algo cómodo para la sala", null, null, null, true, null);
    }

    private void assertContingencia(ChatResponse r) {
        assertThat(r.getRespuesta()).isEqualTo(RagResult.fallback().respuesta());
    }

    @Test void insertSesionFalla_contingencia() {
        when(sesiones.resolveSession(any(), anyLong())).thenThrow(new DataAccessResourceFailureException("db"));
        assertContingencia(chat());
    }

    @Test void loadHistoryFalla_contingencia() {
        when(sesiones.loadHistory(any())).thenThrow(new DataAccessResourceFailureException("db"));
        assertContingencia(chat());
    }

    @Test void memoriaFalla_contingencia() {
        when(memoria.getOrCreate(any())).thenThrow(new IllegalStateException("x", new RuntimeException()));
        assertContingencia(chat());
    }

    @Test void clasificadorFalla_contingencia() {
        when(classifier.classify(anyString(), any())).thenThrow(new NullPointerException());
        assertContingencia(chat());
    }

    @Test void persistenciaFalla_noTiraLaRespuestaGenerada() {
        doThrow(new DataAccessResourceFailureException("db")).when(persistencia)
            .persistirMensajes(any(), anyLong(), anyString(), any());
        ChatResponse r = chat();
        assertThat(r.getRespuesta()).isEqualTo("respuesta ok");
        assertThat(r.getSesionId()).isEqualTo(firma.firmar(1L, sesion));
    }

    @Test void slugDuplicado_failClosed404() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findBySlug("hotclick")).thenThrow(new IncorrectResultSizeDataAccessException(1, 2));
        ShoppingAssistantTenantGuard guard = new ShoppingAssistantTenantGuard(repo);
        assertThatThrownBy(() -> guard.requireEmpresaActiva("hotclick"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("404");
    }

    @Test void controller_bdDeSesionesCaida_da200ConContingencia() throws Exception {
        when(sesiones.resolveSession(any(), anyLong())).thenThrow(new DataAccessResourceFailureException("db"));
        EmpresaRepository repo = mock(EmpresaRepository.class);
        Empresa e = mock(Empresa.class);
        when(e.getId()).thenReturn(1L);
        when(e.getEstadoEmpresa()).thenReturn("ACTIVO");
        when(repo.findBySlug("hotclick")).thenReturn(Optional.of(e));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new ShoppingAssistantController(service,
                mock(AssistantMetricsService.class), new ShoppingAssistantTenantGuard(repo),
                mock(ShoppingAssistantImageSearchHandler.class)))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/public/shopping-assistant/chat").contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensaje\":\"Algo cómodo para la sala\",\"empresaSlug\":\"hotclick\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.respuesta").value(RagResult.fallback().respuesta()));
    }

    // ---- B1 / B2 (hallazgos bajos de Seguridad) ----

    private static final String SENTINEL = "SENTINEL-VISITANTE-7f3a";
    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    private ListAppender<ILoggingEvent> capturar(Class<?> clazz) {
        logger = (Logger) LoggerFactory.getLogger(clazz);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    @AfterEach
    void soltarAppender() {
        if (logger != null && appender != null) logger.detachAppender(appender);
    }

    private static String volcado(ListAppender<ILoggingEvent> a) {
        StringBuilder sb = new StringBuilder();
        for (ILoggingEvent ev : a.list) {
            sb.append(ev.getFormattedMessage()).append('\n');
            for (var tp = ev.getThrowableProxy(); tp != null; tp = tp.getCause()) {
                sb.append(tp.getClassName()).append(':').append(tp.getMessage()).append('\n');
            }
        }
        return sb.toString();
    }

    private static DataAccessResourceFailureException errorJdbcConTextoVisitante() {
        return new DataAccessResourceFailureException("could not execute statement: " + SENTINEL,
            new SQLException("ERROR: value too long, Detail: (" + SENTINEL + ")"));
    }

    @Test void b1_dataAccessFueraDelBreaker_logSinMensajeNiStacktrace() {
        var a = capturar(ShoppingAssistantService.class);
        when(sesiones.loadHistory(any())).thenThrow(errorJdbcConTextoVisitante());
        assertContingencia(chat());
        String log = volcado(a);
        assertThat(log).doesNotContain(SENTINEL).contains("ref=").contains("paso=chat")
            .contains(DataAccessResourceFailureException.class.getName());
        assertThat(a.list).allMatch(ev -> ev.getThrowableProxy() == null);
    }

    @Test void b1_causaDataAccessEnvuelta_tambienSeOmite() {
        var a = capturar(ShoppingAssistantService.class);
        when(sesiones.loadHistory(any())).thenThrow(new IllegalStateException(SENTINEL, errorJdbcConTextoVisitante()));
        assertContingencia(chat());
        assertThat(volcado(a)).doesNotContain(SENTINEL);
        assertThat(a.list).allMatch(ev -> ev.getThrowableProxy() == null);
    }

    @Test void b1_runtimeNoDeDatos_conservaStacktrace() {
        var a = capturar(ShoppingAssistantService.class);
        when(classifier.classify(anyString(), any())).thenThrow(new IllegalStateException("bug"));
        assertContingencia(chat());
        assertThat(a.list).anyMatch(ev -> ev.getThrowableProxy() != null);
    }

    @Test void b1_persistenciaDataAccess_logSinTextoVisitante() {
        var a = capturar(ShoppingAssistantService.class);
        doThrow(errorJdbcConTextoVisitante()).when(persistencia)
            .persistirMensajes(any(), anyLong(), anyString(), any());
        assertThat(chat().getRespuesta()).isEqualTo("respuesta ok");
        String log = volcado(a);
        assertThat(log).doesNotContain(SENTINEL).contains("ref=").contains("paso=persistencia");
        assertThat(a.list).allMatch(ev -> ev.getThrowableProxy() == null);
    }

    @Test void b2_persistenciaRuntimeNoDeDatos_noEsBestEffort() {
        doThrow(new IllegalStateException("bug")).when(persistencia)
            .persistirMensajes(any(), anyLong(), anyString(), any());
        // ya no se traga como best-effort: sube al catch externo y da contingencia
        assertContingencia(chat());
    }

    @Test void b1_tenantGuardSlugDuplicado_logSinMensaje() {
        var a = capturar(ShoppingAssistantTenantGuard.class);
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findBySlug("hotclick")).thenThrow(
            new IncorrectResultSizeDataAccessException(SENTINEL, 1, 2));
        assertThatThrownBy(() -> new ShoppingAssistantTenantGuard(repo).requireEmpresaActiva("hotclick"))
            .isInstanceOf(ResponseStatusException.class);
        assertThat(volcado(a)).doesNotContain(SENTINEL).contains("ref=");
        assertThat(a.list).allMatch(ev -> ev.getThrowableProxy() == null);
    }
}
