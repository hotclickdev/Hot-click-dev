package com.hotclick.service.producto;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProductoWriteOperations — pausar / publicar catálogo")
class ProductoWriteOperationsVisibleCatalogoTest {

    @Mock ProductoRepository productoRepository;
    @Mock ProductoCacheEvictor cacheEvictor;

    @InjectMocks ProductoWriteOperations operations;

    @Test
    @DisplayName("pausar pone visibleCatalogo=false y limpia cache público")
    void pausarOcultaDelCatalogo() {
        Producto p = new Producto();
        p.setVisibleCatalogo(true);
        when(productoRepository.findById(4L)).thenReturn(Optional.of(p));
        when(productoRepository.save(p)).thenReturn(p);

        operations.toggleVisibleCatalogo(4L, false);

        assertThat(p.getVisibleCatalogo()).isFalse();
        verify(cacheEvictor).evictProductosPublicos();
    }

    @Test
    @DisplayName("publicar vuelve visibleCatalogo=true")
    void publicarMuestraEnCatalogo() {
        Producto p = new Producto();
        p.setVisibleCatalogo(false);
        when(productoRepository.findById(4L)).thenReturn(Optional.of(p));
        when(productoRepository.save(p)).thenReturn(p);

        Producto saved = operations.toggleVisibleCatalogo(4L, true);

        assertThat(saved.getVisibleCatalogo()).isTrue();
    }

    @Test
    @DisplayName("producto inexistente no se silencia")
    void productoAusente() {
        when(productoRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> operations.toggleVisibleCatalogo(9L, true))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }
}
