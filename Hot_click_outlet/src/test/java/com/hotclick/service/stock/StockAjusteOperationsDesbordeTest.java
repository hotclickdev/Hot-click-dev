package com.hotclick.service.stock;

import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** SEC02-01: el ajuste de entrada no acepta cantidades <= 0 ni desborda el int. */
@ExtendWith(MockitoExtension.class)
@DisplayName("[SEC02-01] StockAjusteOperations: sin negativos ni desborde")
class StockAjusteOperationsDesbordeTest {

    @Mock private ProductoRepository productoRepository;
    @Mock private MovimientoStockRepository movimientoStockRepository;
    @Mock private StockMovimientoSupport movimientoSupport;
    @InjectMocks private StockAjusteOperations ops;

    private Producto producto(int stock) {
        Producto p = new Producto();
        p.setId(10L);
        p.setStockActual(stock);
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    @DisplayName("Desborde de int -> IllegalArgumentException (400) y el stock no cambia")
    void desborde() {
        Producto p = producto(5);
        assertThatThrownBy(() -> ops.ajustarEntrada(this, 10L, Integer.MAX_VALUE, "", "x@y.cr"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(p.getStockActual()).isEqualTo(5);
        verify(productoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cantidad negativa -> IllegalArgumentException y el stock no cambia")
    void negativa() {
        Producto p = producto(5);
        assertThatThrownBy(() -> ops.ajustarEntrada(this, 10L, -999_999, "", "x@y.cr"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(p.getStockActual()).isEqualTo(5);
        verify(productoRepository, never()).save(any());
    }
}
