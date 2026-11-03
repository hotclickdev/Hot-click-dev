package com.hotclick.service;

import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * MED-1 (Auditor 3): carrito de servidor (CarritoService.agregarItem / vaciar) y pedido de invitado
 * (StorefrontGuestOrderService) pasan por StockService.reservar/liberarReserva. Política: personalizado
 * o bajo pedido se vende sin stock → no se exige, no se reserva y no se libera (igual que el checkout).
 */
@DisplayName("MED-1 | personalizados sin stock en carrito y tienda")
class StockPersonalizadoCarritoTiendaTest {

    private final ProductoRepository repo = mock(ProductoRepository.class);

    private StockService service() {
        StockService s = new StockService();
        ReflectionTestUtils.setField(s, "productoRepository", repo);
        ReflectionTestUtils.setField(s, "movimientoSupport", mock(com.hotclick.service.stock.StockMovimientoSupport.class));
        return s;
    }

    private static Producto producto(boolean personalizado, int stock, int reservado) {
        Producto p = new Producto();
        p.setId(5L);
        p.setNombreProducto("Taza grabada");
        p.setEsPersonalizado(personalizado);
        p.setStockActual(stock);
        p.setStockReservado(reservado);
        return p;
    }

    @Test
    @DisplayName("personalizado con stock 0 se puede reservar (carrito/tienda) sin tocar stock_reservado")
    void personalizadoSinStockNoReserva() {
        Producto p = producto(true, 0, 0);
        service().reservar(p, 3, "carrito-1", "carrito-usuario");
        assertThat(p.getStockReservado()).isZero();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("personalizado con stock tampoco suma reserva (el checkout no la descontaría nunca)")
    void personalizadoConStockNoSumaReserva() {
        Producto p = producto(true, 10, 2);
        service().reservar(p, 3, "STOREFRONT-x", "a@b.cr");
        assertThat(p.getStockReservado()).isEqualTo(2);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("vaciar carrito no libera reservas de un personalizado (nunca reservó)")
    void personalizadoNoLibera() {
        Producto p = producto(true, 10, 2);
        service().liberarReserva(p, 2, "liberacion-carrito-1", "sistema");
        assertThat(p.getStockReservado()).isEqualTo(2);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("producto normal sigue exigiendo stock y reservando")
    void normalSigueIgual() {
        assertThatThrownBy(() -> service().reservar(producto(false, 0, 0), 1, "carrito-1", "op"))
            .isInstanceOf(StockInsuficienteException.class);
        Producto p = producto(false, 5, 1);
        service().reservar(p, 2, "carrito-1", "op");
        assertThat(p.getStockReservado()).isEqualTo(3);
    }
}
