package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.TurnstileFormGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("SEG-F / PAG-4 | guard del checkout de invitado")
class GuestCheckoutGuardTest {

    private GuestCheckoutGuard guard;
    private TurnstileFormGuard turnstile;
    private final AtomicLong ids = new AtomicLong(100);
    private final AtomicInteger creados = new AtomicInteger();

    @BeforeEach
    void setUp() {
        turnstile = mock(TurnstileFormGuard.class);
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        PedidoRepository repo = mock(PedidoRepository.class);
        when(repo.findAllById(anyIterable())).thenAnswer(inv -> {
            List<Pedido> out = new java.util.ArrayList<>();
            for (Object id : (Iterable<?>) inv.getArgument(0)) {
                Pedido p = new Pedido();
                p.setId((Long) id);
                p.setEstadoPedido("PENDIENTE_COMPROBANTE");
                out.add(p);
            }
            return out;
        });
        guard = new GuestCheckoutGuard(turnstile, ip, repo);
    }

    private static PaymentCheckoutRequest req(String correo, long producto, int cantidad) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setGuestEmail(correo);
        r.setBodegaId(54L);
        r.setMetodoEnvio("RETIRO");
        PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
        i.setProductoId(producto);
        i.setCantidad(cantidad);
        r.setItems(List.of(i));
        return r;
    }

    private ResponseEntity<ResponseDTO> crear() {
        creados.incrementAndGet();
        PaymentCheckoutResponse pc = new PaymentCheckoutResponse(ids.incrementAndGet(), "ORD-X", null, "PENDIENTE", 2500, "SINPE");
        return ResponseEntity.ok(ResponseDTO.success("ok", pc));
    }

    @Test
    void dobleClicSimultaneoCreaUnSoloPedido() throws Exception {
        ExecutorService ex = Executors.newFixedThreadPool(2);
        CountDownLatch go = new CountDownLatch(1);
        CountDownLatch dentro = new CountDownLatch(1);
        Future<ResponseEntity<ResponseDTO>> a = ex.submit(() -> guard.ejecutar(req("a@x.com", 577, 1), new MockHttpServletRequest(), () -> {
            dentro.countDown();
            try { go.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            return crear();
        }));
        dentro.await();
        Future<ResponseEntity<ResponseDTO>> b = ex.submit(() -> guard.ejecutar(req("a@x.com", 577, 1), new MockHttpServletRequest(), this::crear));
        Thread.sleep(100);
        go.countDown();
        assertThat(a.get().getBody()).isSameAs(b.get().getBody());
        assertThat(creados.get()).isEqualTo(1);
        ex.shutdown();
    }

    @Test
    void idempotencyKeyDistintaPermiteOtroPedido() {
        MockHttpServletRequest h1 = new MockHttpServletRequest();
        h1.addHeader("Idempotency-Key", "k1");
        MockHttpServletRequest h2 = new MockHttpServletRequest();
        h2.addHeader("Idempotency-Key", "k2");
        guard.ejecutar(req("a@x.com", 577, 1), h1, this::crear);
        guard.ejecutar(req("a@x.com", 577, 1), h2, this::crear);
        assertThat(creados.get()).isEqualTo(2);
    }

    @Test
    void topePorProducto() {
        var r = guard.ejecutar(req("a@x.com", 577, 5), new MockHttpServletRequest(), this::crear);
        assertThat(r.getStatusCode().value()).isEqualTo(429);
        assertThat(creados.get()).isZero();
    }

    @Test
    void cupoDeUnidadesPendientesPorIp() {
        for (int i = 0; i < 2; i++) {
            var ok = guard.ejecutar(req("c" + i + "@x.com", 500 + i, 3), new MockHttpServletRequest(), this::crear);
            assertThat(ok.getStatusCode().value()).isEqualTo(200);
        }
        var r = guard.ejecutar(req("otro@x.com", 600, 1), new MockHttpServletRequest(), this::crear);
        assertThat(r.getStatusCode().value()).isEqualTo(429);
    }

    @Test
    void turnstileSoloSiEstaHabilitado() {
        when(turnstile.verificado(any(), any())).thenReturn(false);
        assertThat(guard.ejecutar(req("a@x.com", 1, 1), new MockHttpServletRequest(), this::crear).getStatusCode().value()).isEqualTo(200);
        guard.setTurnstileHabilitado(true);
        assertThat(guard.ejecutar(req("b@x.com", 2, 1), new MockHttpServletRequest(), this::crear).getStatusCode().value()).isEqualTo(400);
    }
}
