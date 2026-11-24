package com.hotclick.agente.pago;

import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraEstado;
import com.hotclick.agente.enlace.EnlaceCompraEstadoService;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.PedidoGrupoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA_CR;
import static com.hotclick.agente.pago.PagoBotTestSupport.enlace;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-08: la guarda de idempotencia y los rechazos viven en el estado del enlace. */
class PagoBotTransicionTest {

    private EnlaceCompraRepository enlaces;
    private EnlaceCompraEstadoService estado;
    private PedidoRepository pedidos;
    private PedidoGrupoService grupos;
    private PagoBotTransicion transicion;
    private EnlaceCompra e;
    private Pedido pedido;

    @BeforeEach
    void setUp() {
        enlaces = mock(EnlaceCompraRepository.class);
        estado = mock(EnlaceCompraEstadoService.class);
        pedidos = mock(PedidoRepository.class);
        grupos = mock(PedidoGrupoService.class);
        transicion = new PagoBotTransicion(enlaces, estado, pedidos, grupos);
        e = enlace(42L, EnlaceCompraEstado.ABIERTO, UUID.randomUUID(), AHORA_CR);
        e.setPedidoId(100L);
        pedido = new Pedido();
        pedido.setNumeroPedido("HC-0100");
        pedido.setTotalPedido(12500);
        pedido.setFechaEntregaEstimada(LocalDate.of(2026, 12, 10));
        when(enlaces.findByIdForUpdate(42L)).thenReturn(Optional.of(e));
        when(pedidos.findById(100L)).thenReturn(Optional.of(pedido));
        when(grupos.delGrupo(pedido)).thenReturn(List.of(pedido));
    }

    @Test
    void pagadoMarcaElEnlaceYDevuelveElContexto() {
        Optional<ContextoPago> ctx = transicion.registrarPagado(42L, 100L);

        assertThat(ctx).isPresent();
        assertThat(ctx.get().numerosPedido()).isEqualTo("HC-0100");
        assertThat(ctx.get().total()).isEqualTo(12500);
        assertThat(ctx.get().entregaEstimada()).isEqualTo(LocalDate.of(2026, 12, 10));
        verify(estado).marcarPagadoPorPedido(100L);
    }

    @Test
    void pagadoDosVecesNoAvisaDosVeces() {
        e.setEstado(EnlaceCompraEstado.PAGADO);

        assertThat(transicion.registrarPagado(42L, 100L)).isEmpty();
        verify(estado, never()).marcarPagadoPorPedido(any());
    }

    @Test
    void primerRechazoSumaUnoYMarcaRechazado() {
        Optional<ContextoPago> ctx = transicion.registrarRechazado(42L, 100L);

        assertThat(ctx).isPresent();
        assertThat(ctx.get().rechazos()).isEqualTo(1);
        verify(estado).marcarRechazadoPorPedido(100L);
    }

    @Test
    void elMismoRechazoRepetidoNoSumaOtroNiAvisaOtraVez() {
        e.setEstado(EnlaceCompraEstado.RECHAZADO);
        e.setRechazosPago(1);

        assertThat(transicion.registrarRechazado(42L, 100L)).isEmpty();
        assertThat(e.getRechazosPago()).isEqualTo(1);
        verify(estado, never()).marcarRechazadoPorPedido(any());
    }

    @Test
    void rechazoDeUnPedidoQueYaNoEsElVigenteSeIgnora() {
        e.setPedidoId(101L);

        assertThat(transicion.registrarRechazado(42L, 100L)).isEmpty();
    }

    @Test
    void segundoRechazoDeOtroPedidoDelMismoEnlaceCuentaDos() {
        e.setRechazosPago(1);
        e.setEstado(EnlaceCompraEstado.ABIERTO); // el cliente reabrió el enlace y creó otro pedido
        e.setPedidoId(100L);

        assertThat(transicion.registrarRechazado(42L, 100L).orElseThrow().rechazos()).isEqualTo(2);
    }

    @Test
    void rechazoSobreEnlaceYaPagadoOVencidoSeIgnora() {
        e.setEstado(EnlaceCompraEstado.PAGADO);
        assertThat(transicion.registrarRechazado(42L, 100L)).isEmpty();
        e.setEstado(EnlaceCompraEstado.VENCIDO);
        assertThat(transicion.registrarRechazado(42L, 100L)).isEmpty();
    }

    @Test
    void avisoPendienteQuedaAnotadoEnElEnlace() {
        transicion.marcarAvisoPendiente(42L, "PAGADO");

        assertThat(e.getAvisoPendiente()).isEqualTo("PAGADO");
    }
}
