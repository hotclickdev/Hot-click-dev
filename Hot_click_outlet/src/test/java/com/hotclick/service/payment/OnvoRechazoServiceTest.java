package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** QA5 MEDIO: cobro rechazado por ONVO → pago FALLIDO y stock liberado una sola vez, sin depender del webhook. */
@DisplayName("ONVO rechazo: FALLIDO + liberación de stock idempotente")
class OnvoRechazoServiceTest {

    private static final String SESION = "cs_rechazo_test";
    private static final String MODO = "test";

    private final OnvoService onvo = mock(OnvoService.class);
    private final OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
    private final PagoExpiradoCancelador cancelador = mock(PagoExpiradoCancelador.class);
    private final OnvoRechazoService servicio = new OnvoRechazoService(onvo, provider, cancelador);

    @BeforeEach
    void armar() {
        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.modoEsperado()).thenReturn(MODO);
        doReturn(Map.of("paymentStatus", "unpaid", "paymentIntentId", "pi_1", "mode", MODO)).when(onvo).obtenerCheckoutSession(SESION);
        when(provider.expirarSesionSinCobro(SESION)).thenReturn(true);
        when(cancelador.marcarFallido(anyLong())).thenReturn(true);
    }

    private static Map<String, Object> intent(String status, Object error) {
        var m = new java.util.HashMap<String, Object>();
        m.put("status", status);
        m.put("mode", MODO);
        if (error != null) m.put("lastPaymentError", error);
        return m;
    }

    @Test
    @DisplayName("declinado (requires_payment_method + lastPaymentError) → expira sesión y marca FALLIDO")
    void declinadoCierra() {
        doReturn(intent("requires_payment_method", Map.of("code", "card_declined"))).when(onvo).obtenerPaymentIntent("pi_1");
        assertThat(servicio.cerrarSiRechazado(7L, SESION)).isTrue();
        verify(provider).expirarSesionSinCobro(SESION);
        verify(cancelador).marcarFallido(7L);
    }

    @Test
    @DisplayName("estado inicial sin lastPaymentError, en proceso o succeeded → no toca nada")
    void noRechazadoNoToca() {
        for (Map<String, Object> i : List.of(intent("requires_payment_method", null),
                intent("requires_payment_method", Map.of()), intent("processing", Map.of("code", "x")),
                intent("succeeded", null))) {
            doReturn(i).when(onvo).obtenerPaymentIntent("pi_1");
            assertThat(servicio.cerrarSiRechazado(7L, SESION)).isFalse();
        }
        verify(provider, never()).expirarSesionSinCobro(any());
        verify(cancelador, never()).marcarFallido(anyLong());
    }

    @Test
    @DisplayName("modo distinto, sesión pagada, sin llave u ONVO no expira → fail-closed")
    void failClosed() {
        Map<String, Object> otroModo = intent("requires_payment_method", Map.of("code", "x"));
        otroModo.put("mode", "live");
        doReturn(otroModo).when(onvo).obtenerPaymentIntent("pi_1");
        assertThat(servicio.cerrarSiRechazado(7L, SESION)).isFalse();

        doReturn(intent("requires_payment_method", Map.of("code", "x"))).when(onvo).obtenerPaymentIntent("pi_1");
        when(provider.expirarSesionSinCobro(SESION)).thenReturn(false);
        assertThat(servicio.cerrarSiRechazado(7L, SESION)).isFalse();
        verify(cancelador, never()).marcarFallido(anyLong());

        doReturn(Map.of("paymentStatus", "paid", "paymentIntentId", "pi_1")).when(onvo).obtenerCheckoutSession(SESION);
        assertThat(servicio.cerrarSiRechazado(7L, SESION)).isFalse();
        when(onvo.isPagosDisponibles()).thenReturn(false);
        assertThat(servicio.cerrarSiRechazado(7L, SESION)).isFalse();
        assertThat(servicio.cerrarSiRechazado(7L, null)).isFalse();
        verify(cancelador, never()).marcarFallido(anyLong());
    }

    @Test
    @DisplayName("marcarFallido concurrente (reconsulta + limpieza + webhook): un solo cierre, stock liberado una vez")
    void marcarFallidoConcurrenteUnaVez() throws Exception {
        PagoRepository pagoRepository = mock(PagoRepository.class);
        StockReservationService stock = mock(StockReservationService.class);
        PedidoGrupoService grupo = mock(PedidoGrupoService.class);
        PagoExpiradoCancelador real = new PagoExpiradoCancelador(pagoRepository, mock(PedidoRepository.class), stock, grupo);
        Pedido pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("HC-RECH-1");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        Pago pago = new Pago();
        pago.setId(30L);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pedido);
        // Simula el FOR UPDATE: el lock de fila se toma al leer y se suelta al terminar cada llamada.
        ReentrantLock fila = new ReentrantLock();
        when(pagoRepository.findByIdForUpdate(30L)).thenAnswer(i -> { fila.lock(); return Optional.of(pago); });
        when(grupo.delGrupo(pedido)).thenReturn(List.of(pedido));

        int hilos = 8;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        AtomicInteger cerrados = new AtomicInteger();
        List<Future<?>> fs = new java.util.ArrayList<>();
        for (int k = 0; k < hilos; k++) {
            fs.add(pool.submit(() -> {
                salida.await();
                try { if (real.marcarFallido(30L)) cerrados.incrementAndGet(); }
                finally { if (fila.isHeldByCurrentThread()) fila.unlock(); }
                return null;
            }));
        }
        salida.countDown();
        for (Future<?> f : fs) f.get(10, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(cerrados.get()).isEqualTo(1);
        verify(stock, times(1)).liberarReservas(pedido);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_FALLIDO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        // Un pago ya FALLIDO no vuelve a cancelarse por TTL.
        assertThat(real.cancelar(30L)).isFalse();
        verify(stock, times(1)).liberarReservas(pedido);
    }
}
