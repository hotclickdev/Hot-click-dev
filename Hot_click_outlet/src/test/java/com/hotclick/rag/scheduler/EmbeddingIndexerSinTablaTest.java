package com.hotclick.rag.scheduler;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.rag.event.ProductoGuardadoEvent;
import com.hotclick.rag.repository.ProductoEmbeddingRepository;
import com.hotclick.rag.service.EmbeddingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@DisplayName("EmbeddingIndexerService sin la tabla de embeddings")
class EmbeddingIndexerSinTablaTest {

    private EmbeddingService voyage;
    private ProductoEmbeddingRepository repo;
    private EmbeddingIndexerService indexer;
    private ListAppender<ILoggingEvent> logs;
    private Logger logger;

    @BeforeEach
    void setUp() {
        voyage = mock(EmbeddingService.class);
        repo = mock(ProductoEmbeddingRepository.class);
        when(repo.tablaDisponible()).thenReturn(false);
        indexer = new EmbeddingIndexerService(voyage, repo);

        logger = (Logger) LoggerFactory.getLogger(EmbeddingIndexerService.class);
        logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void tearDown() { logger.detachAppender(logs); }

    @Test
    @DisplayName("El batch nocturno corta antes de consultar o llamar a Voyage, con INFO y sin WARN ni ERROR")
    void batch_cortaAntesDeVoyage() {
        indexer.indexarLoteNocturno();

        verifyNoInteractions(voyage);
        verify(repo).tablaDisponible();
        verifyNoMoreInteractions(repo);
        assertThat(logs.list).noneMatch(e -> e.getLevel().isGreaterOrEqual(Level.WARN));
        assertThat(logs.list).anyMatch(e -> e.getLevel() == Level.INFO
            && e.getFormattedMessage().contains("Batch omitido"));
    }

    @Test
    @DisplayName("El evento de guardado tampoco llama a Voyage ni intenta el upsert")
    void evento_noLlamaAVoyage() {
        ProductoGuardadoEvent ev = new ProductoGuardadoEvent(
            this, 7L, 3L, "Taza", "Taza de barro", "Sarchí", "SKU-1", "cafe", null);

        indexer.onProductoGuardado(ev);

        verifyNoInteractions(voyage);
        verify(repo).tablaDisponible();
        verifyNoMoreInteractions(repo);
    }
}
