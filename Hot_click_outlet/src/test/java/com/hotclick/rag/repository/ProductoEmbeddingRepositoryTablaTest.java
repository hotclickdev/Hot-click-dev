package com.hotclick.rag.repository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Disponibilidad cacheada de hot_click_producto_embedding_tb")
class ProductoEmbeddingRepositoryTablaTest {

    private EmbeddedDatabase db;
    private JdbcTemplate jdbc;
    private ProductoEmbeddingRepository repo;
    private final AtomicLong reloj = new AtomicLong(1_000_000_000_000L);

    @BeforeEach
    void setUp() {
        db = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        jdbc = new JdbcTemplate(db);
        repo = new ProductoEmbeddingRepository(jdbc);
        repo.setRelojNanos(reloj::get);
    }

    @AfterEach
    void tearDown() { db.shutdown(); }

    @Test
    @DisplayName("Sin la tabla devuelve false, y no vuelve a consultar antes del reintento")
    void sinTabla_false_yCacheado() {
        assertThat(repo.tablaDisponible()).isFalse();

        // Aunque aparezca la tabla, dentro de la ventana de reintento se respeta el cache.
        jdbc.execute("CREATE TABLE hot_click_producto_embedding_tb (id INT)");
        reloj.addAndGet(ProductoEmbeddingRepository.REINTENTO_SI_NO_EXISTE.toNanos() - 1);
        assertThat(repo.tablaDisponible()).isFalse();
    }

    @Test
    @DisplayName("Pasado el reintento detecta que la tabla ya existe")
    void sinTabla_reintentaYDetecta() {
        assertThat(repo.tablaDisponible()).isFalse();
        jdbc.execute("CREATE TABLE hot_click_producto_embedding_tb (id INT)");
        reloj.addAndGet(ProductoEmbeddingRepository.REINTENTO_SI_NO_EXISTE.toNanos() + 1);
        assertThat(repo.tablaDisponible()).isTrue();
    }

    @Test
    @DisplayName("Con la tabla devuelve true y lo cachea hasta la revalidación")
    void conTabla_true_yCacheado() {
        jdbc.execute("CREATE TABLE hot_click_producto_embedding_tb (id INT)");
        assertThat(repo.tablaDisponible()).isTrue();

        jdbc.execute("DROP TABLE hot_click_producto_embedding_tb");
        reloj.addAndGet(ProductoEmbeddingRepository.REVALIDAR_SI_EXISTE.toNanos() - 1);
        assertThat(repo.tablaDisponible()).isTrue();

        reloj.addAndGet(2);
        assertThat(repo.tablaDisponible()).isFalse();
    }

    @Test
    @DisplayName("Si la verificación falla se asume disponible y no se cachea")
    void fallaLaVerificacion_seAsumeDisponible_sinCachear() {
        JdbcTemplate roto = mock(JdbcTemplate.class);
        when(roto.queryForObject(anyString(), any(Class.class), any(Object[].class)))
            .thenThrow(new CannotGetJdbcConnectionException("sin conexion"));
        ProductoEmbeddingRepository r = new ProductoEmbeddingRepository(roto);
        r.setRelojNanos(reloj::get);

        assertThat(r.tablaDisponible()).isTrue();
        assertThat(r.tablaDisponible()).isTrue();
        verify(roto, times(2)).queryForObject(anyString(), any(Class.class), any(Object[].class));
    }
}
