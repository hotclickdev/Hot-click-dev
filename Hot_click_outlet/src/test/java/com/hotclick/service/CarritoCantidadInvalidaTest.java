package com.hotclick.service;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** M-03: el carrito del servidor rechaza cantidades en cero o negativas sin tocar el stock reservado. */
class CarritoCantidadInvalidaTest {

    @ParameterizedTest
    @ValueSource(ints = {0, -1, -5})
    @DisplayName("M-03 | CarritoService.agregarItem con cantidad ≤ 0 → error claro")
    void carritoRechaza(int cantidad) {
        CarritoService s = new CarritoService();
        assertThatThrownBy(() -> s.agregarItem(1L, 10L, cantidad))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cantidad");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, -5})
    @DisplayName("M-03 | StockService.reservar con cantidad ≤ 0 → no baja stockReservado")
    void reservarRechaza(int cantidad) {
        StockService s = new StockService();
        ProductoRepository repo = mock(ProductoRepository.class);
        ReflectionTestUtils.setField(s, "productoRepository", repo);
        Producto p = new Producto();
        p.setStockActual(10);
        p.setStockReservado(5);
        assertThatThrownBy(() -> s.reservar(p, cantidad, "ref", "op"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(p.getStockReservado()).isEqualTo(5);
        verify(repo, never()).save(any());
    }
}
