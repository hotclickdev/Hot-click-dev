package com.hotclick.agente.enlace;

import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** AG-12: a las 24 h el enlace sin pagar queda VENCIDO (venta perdida), también si tenía un pedido sin pagar. */
class EnlaceVentaPerdidaTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 12, 8, 10, 0);

    private EnlaceCompraRepository repo;
    private EnlaceCompraReserva reserva;

    @BeforeEach
    void setUp() {
        repo = mock(EnlaceCompraRepository.class);
        reserva = new EnlaceCompraReserva(mock(ProductoRepository.class), repo);
    }

    private EnlaceCompra enlace(EnlaceCompraEstado estado, Long pedidoId) {
        EnlaceCompra e = new EnlaceCompra();
        e.setEstado(estado);
        e.setPedidoId(pedidoId);
        e.setCreado(AHORA.minusHours(25));
        e.setVence(AHORA.minusHours(1));
        when(repo.findByIdForUpdate(1L)).thenReturn(Optional.of(e));
        return e;
    }

    @Test
    void conPedidoSinPagarVenceComoVentaPerdida() {
        EnlaceCompra e = enlace(EnlaceCompraEstado.ABIERTO, 100L);

        assertThat(reserva.liberarYVencer(1L, true, AHORA)).isTrue();
        assertThat(e.getEstado()).isEqualTo(EnlaceCompraEstado.VENCIDO);
    }

    @Test
    void rechazadoYNoReintentadoTambienVence() {
        EnlaceCompra e = enlace(EnlaceCompraEstado.RECHAZADO, 100L);

        assertThat(reserva.liberarYVencer(1L, true, AHORA)).isTrue();
        assertThat(e.getEstado()).isEqualTo(EnlaceCompraEstado.VENCIDO);
    }

    @Test
    void unEnlacePagadoNuncaVence() {
        EnlaceCompra e = enlace(EnlaceCompraEstado.PAGADO, 100L);

        reserva.liberarYVencer(1L, true, AHORA);
        assertThat(e.getEstado()).isEqualTo(EnlaceCompraEstado.PAGADO);
    }
}
