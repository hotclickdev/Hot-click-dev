package com.hotclick.rag.scheduler;

import com.hotclick.rag.event.ProductoGuardadoEvent;
import com.hotclick.rag.repository.ProductoEmbeddingRepository;
import com.hotclick.rag.service.EmbeddingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * La indexación IA de un producto solo corre si el guardado hizo commit:
 * un rollback no debe dejar embeddings de datos que no existen.
 */
class EmbeddingIndexerAfterCommitTest {

    @Configuration
    @EnableTransactionManagement
    static class Cfg {
        @Bean DataSource ds() {
            return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true).build();
        }
        @Bean PlatformTransactionManager txm(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean EmbeddingService embeddingService() { return mock(EmbeddingService.class); }
        @Bean ProductoEmbeddingRepository embeddingRepo() { return mock(ProductoEmbeddingRepository.class); }
        @Bean EmbeddingIndexerService indexer(EmbeddingService s, ProductoEmbeddingRepository r) {
            return new EmbeddingIndexerService(s, r);
        }
    }

    private AnnotationConfigApplicationContext ctx;
    private ProductoEmbeddingRepository repo;
    private ApplicationEventPublisher publisher;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        ctx = new AnnotationConfigApplicationContext(Cfg.class);
        repo = ctx.getBean(ProductoEmbeddingRepository.class);
        when(ctx.getBean(EmbeddingService.class).generarEmbedding(anyString())).thenReturn(new float[]{0.1f});
        publisher = ctx;
        tx = new TransactionTemplate(ctx.getBean(PlatformTransactionManager.class));
    }

    @AfterEach
    void tearDown() { ctx.close(); }

    private ProductoGuardadoEvent evento() {
        return new ProductoGuardadoEvent(this, 7L, 3L, "Taza", "Taza de barro", "Sarchí", "SKU-1", "cafe", null);
    }

    @Test
    void rollback_noIndexa() {
        tx.executeWithoutResult(status -> {
            publisher.publishEvent(evento());
            status.setRollbackOnly();
        });
        verify(repo, never()).upsertEmbedding(any(), any(), any(), any());
    }

    @Test
    void commit_indexaUnaVez() {
        tx.executeWithoutResult(status -> publisher.publishEvent(evento()));
        verify(repo, times(1)).upsertEmbedding(eq(7L), eq(3L), any(), anyString());
    }

    @Test
    void sinTransaccion_indexaIgual() {
        publisher.publishEvent(evento());
        verify(repo, times(1)).upsertEmbedding(eq(7L), eq(3L), any(), anyString());
    }
}
