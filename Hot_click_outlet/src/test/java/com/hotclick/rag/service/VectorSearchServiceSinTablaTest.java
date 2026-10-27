package com.hotclick.rag.service;

import com.hotclick.rag.repository.ProductoEmbeddingRepository;
import com.hotclick.service.publicchat.PublicChatIntentHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("VectorSearchService sin la tabla de embeddings")
class VectorSearchServiceSinTablaTest {

    private EmbeddingService voyage;
    private JdbcTemplate jdbc;
    private ProductoEmbeddingRepository repo;
    private VectorSearchService service;

    @BeforeEach
    void setUp() {
        voyage = mock(EmbeddingService.class);
        jdbc = mock(JdbcTemplate.class);
        repo = mock(ProductoEmbeddingRepository.class);
        PublicChatIntentHelper helper = mock(PublicChatIntentHelper.class);
        when(helper.userTerms(anyString())).thenReturn(List.of("taza"));
        service = new VectorSearchService(voyage, jdbc, helper, repo);
    }

    @Test
    @DisplayName("Sin tabla no se llama a Voyage ni se consulta la tabla de embeddings, y la búsqueda sigue por keywords")
    @SuppressWarnings("unchecked")
    void sinTabla_noLlamaAVoyage() {
        when(repo.tablaDisponible()).thenReturn(false);

        assertThat(service.buscarSimilares(1L, "taza de barro", 5, false)).isEmpty();

        verifyNoInteractions(voyage);
        verify(jdbc, never()).query(contains("hot_click_producto_embedding_tb"), any(RowMapper.class), any(Object[].class));
        // El fallback por keywords sí se intentó.
        verify(jdbc, atLeastOnce()).query(anyString(), any(RowMapper.class), any(Object[].class));
    }

    @Test
    @DisplayName("Con tabla sí se genera el embedding de la consulta")
    void conTabla_llamaAVoyage() {
        when(repo.tablaDisponible()).thenReturn(true);
        when(voyage.generarEmbedding(anyString())).thenReturn(new float[] {0.1f, 0.2f});

        service.buscarSimilares(1L, "taza de barro", 5, false);

        verify(voyage, times(1)).generarEmbedding("taza de barro");
    }
}
