package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Candado de la limpieza TTL: una sola instancia corre a la vez (ShedLock) y cada pago se cancela bajo
 * FOR UPDATE con chequeo de PENDIENTE, así dos pasadas (o una pasada contra una captura) no cancelan
 * dos veces ni liberan el stock dos veces.
 */
@DisplayName("Limpieza TTL: sin ejecuciones concurrentes ni doble cancelación")
class PagoExpiradoCanceladorConcurrenciaTest {

    @Test
    @DisplayName("el scheduler está protegido por ShedLock")
    void schedulerConShedLock() throws Exception {
        SchedulerLock lock = PaymentExpirationCleanupService.class.getMethod("cancelarExpirados")
            .getAnnotation(SchedulerLock.class);
        assertThat(lock).isNotNull();
        assertThat(lock.name()).isEqualTo("payment_expiration_cleanup");
        assertThat(lock.lockAtMostFor()).isNotBlank();
    }

    @Test
    @DisplayName("segunda cancelación del mismo pago → no hace nada (sin doble liberación de stock)")
    void dobleCancelacion_esIdempotente() {
        PagoRepository pagoRepository = mock(PagoRepository.class);
        PedidoRepository pedidoRepository = mock(PedidoRepository.class);
        StockReservationService stock = mock(StockReservationService.class);
        PedidoGrupoService grupo = mock(PedidoGrupoService.class);
        PagoExpiradoCancelador cancelador = new PagoExpiradoCancelador(pagoRepository, pedidoRepository, stock, grupo);

        Pedido pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("HC-TEST-2");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        Pago pago = new Pago();
        pago.setId(20L);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pedido);
        when(pagoRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(pago));
        when(grupo.delGrupo(pedido)).thenReturn(List.of(pedido));

        assertThat(cancelador.cancelar(20L)).isTrue();
        assertThat(cancelador.cancelar(20L)).isFalse();

        verify(pagoRepository, times(2)).findByIdForUpdate(20L);
        verify(pagoRepository, never()).findById(any());
        verify(stock, times(1)).liberarReservas(pedido);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
    }

    @Test
    @DisplayName("pago ya capturado por otra transacción → no se cancela")
    void pagoCapturado_noSeCancela() {
        PagoRepository pagoRepository = mock(PagoRepository.class);
        StockReservationService stock = mock(StockReservationService.class);
        PagoExpiradoCancelador cancelador = new PagoExpiradoCancelador(pagoRepository,
            mock(PedidoRepository.class), stock, mock(PedidoGrupoService.class));
        Pago pago = new Pago();
        pago.setId(21L);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        when(pagoRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(pago));

        assertThat(cancelador.cancelar(21L)).isFalse();
        verify(stock, never()).liberarReservas(any());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }
}
