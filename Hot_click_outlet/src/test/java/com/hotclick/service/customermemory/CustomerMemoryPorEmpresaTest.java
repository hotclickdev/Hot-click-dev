package com.hotclick.service.customermemory;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** MEDIO-1 (área 6): la memoria del asistente se aísla por tienda; sin fuga entre tenants. */
class CustomerMemoryPorEmpresaTest {

    private static final String VISITANTE = "5b0e8c8e-3f7c-4d2a-9f1e-0a1b2c3d4e5f";
    private static final long TIENDA_A = 11L;
    private static final long TIENDA_B = 22L;

    private DriverManagerDataSource db;
    private JdbcTemplate jdbc;
    private CustomerMemoryExtractor extractor;
    private CustomerMemoryService service;

    @BeforeEach
    void setUp() {
        db = new DriverManagerDataSource("jdbc:h2:mem:cm" + UUID.randomUUID().toString().replace("-", "")
            + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(db);
        ResourceDatabasePopulator esquema = new ResourceDatabasePopulator(
            new ClassPathResource("customermemory/customer_memory_v210_h2.sql"));
        esquema.execute(db);
        extractor = mock(CustomerMemoryExtractor.class);
        service = new CustomerMemoryService(jdbc, new ObjectMapper(), extractor);
        ReflectionTestUtils.setField(service, "apiKey", "clave-de-prueba");
    }

    @AfterEach
    void tearDown() { jdbc.execute("SHUTDOWN"); }

    @Test
    @DisplayName("Mismo visitorId en tienda A y B: memorias separadas, B no ve lo de A")
    void mismoVisitante_dosTiendas_sinFuga() {
        when(extractor.extractFromConversation(any(), anyString(), anyString())).thenReturn(Map.of(
            "interests", List.of("tenis para correr"), "brands", List.of("Nike"),
            "budget_colones", 45000, "summary", "Busca tenis"));

        service.updateMemoryAsync(TIENDA_A, VISITANTE, "quiero tenis Nike", "Tengo estos");

        CustomerMemoryDto enA = service.getOrCreate(TIENDA_A, VISITANTE);
        CustomerMemoryDto enB = service.getOrCreate(TIENDA_B, VISITANTE);
        CustomerMemoryDto global = service.getOrCreate(null, VISITANTE);

        assertThat(enA.interests()).containsExactly("tenis para correr");
        assertThat(enA.preferredBrands()).containsExactly("Nike");
        assertThat(enA.estimatedBudget()).isEqualTo(45000L);
        assertThat(enB.hasContent()).isFalse();
        assertThat(enB.toXmlBlock()).isEmpty();
        assertThat(global.hasContent()).isFalse();

        Integer filas = jdbc.queryForObject(
            "SELECT COUNT(*) FROM customer_memory WHERE visitor_id = ?", Integer.class, VISITANTE);
        assertThat(filas).isEqualTo(3);
    }

    @Test
    @DisplayName("Actualizar en B no pisa la memoria de A")
    void actualizarEnB_noPisaA() {
        when(extractor.extractFromConversation(any(), anyString(), anyString()))
            .thenReturn(Map.of("interests", List.of("sofá"), "summary", "Sala"))
            .thenReturn(Map.of("interests", List.of("taladro"), "summary", "Ferretería"));

        service.updateMemoryAsync(TIENDA_A, VISITANTE, "un sofá", "ok");
        service.updateMemoryAsync(TIENDA_B, VISITANTE, "un taladro", "ok");

        assertThat(service.getOrCreate(TIENDA_A, VISITANTE).interests()).containsExactly("sofá");
        assertThat(service.getOrCreate(TIENDA_B, VISITANTE).interests()).containsExactly("taladro");
    }

    @Test
    @DisplayName("getOrCreate repetido no duplica la fila (UNIQUE visitor_id, empresa_id), también la global")
    void getOrCreate_idempotente() {
        service.getOrCreate(TIENDA_A, VISITANTE);
        service.getOrCreate(TIENDA_A, VISITANTE);
        service.getOrCreate(null, VISITANTE);
        service.getOrCreate(null, VISITANTE);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer_memory", Integer.class)).isEqualTo(2);
    }

    @Test
    @DisplayName("BAJO: el log de error no incluye visitorId ni el mensaje de la excepción")
    void logDeError_sinVisitorNiMensaje() {
        Logger logger = (Logger) LoggerFactory.getLogger(CustomerMemoryService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            jdbc.execute("DROP TABLE customer_memory");
            service.getOrCreate(TIENDA_A, VISITANTE);
            service.touchLastVisit(TIENDA_A, VISITANTE);
            service.updateMemoryAsync(TIENDA_A, VISITANTE, "x", "y");
        } finally {
            logger.detachAppender(appender);
        }
        assertThat(appender.list).isNotEmpty();
        assertThat(appender.list).allSatisfy(ev -> {
            assertThat(ev.getFormattedMessage()).doesNotContain(VISITANTE).doesNotContain("CUSTOMER_MEMORY")
                .doesNotContainIgnoringCase("not found");
            assertThat(ev.getThrowableProxy()).isNull();
        });
    }
}
