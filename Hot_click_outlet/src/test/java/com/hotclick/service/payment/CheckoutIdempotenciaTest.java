package com.hotclick.service.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Cupon;
import com.hotclick.service.CuponService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("QA-CONC-2 / CMP-2 | checkout idempotente y cupón inválido visible")
class CheckoutIdempotenciaTest {

    private final CheckoutIdempotencia idem = new CheckoutIdempotencia(new ObjectMapper());

    @Test
    @DisplayName("QA-CONC-2 | 5 clics simultáneos con el mismo cuerpo crean un solo pedido")
    void dobleClic() throws Exception {
        AtomicInteger creados = new AtomicInteger();
        String clave = idem.clave("/sinpe/guest-checkout", "anon", null, Map.of("items", List.of(1, 2)));
        ExecutorService pool = Executors.newFixedThreadPool(5);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<ResponseEntity<String>>> fs = new java.util.ArrayList<>();
        for (int i = 0; i < 5; i++) {
            fs.add(pool.submit(() -> { go.await(); return idem.ejecutar(clave, () -> {
                int n = creados.incrementAndGet();
                try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                return ResponseEntity.ok("ORD-" + n); }); }));
        }
        go.countDown();
        for (var f : fs) assertThat(f.get(5, TimeUnit.SECONDS).getBody()).isEqualTo("ORD-1");
        pool.shutdown();
        assertThat(creados.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("QA-CONC-2 | un error no queda guardado y otro cuerpo es otro pedido")
    void errorSeReintenta() {
        String clave = idem.clave("/x", "anon", null, Map.of("a", 1));
        assertThat(idem.ejecutar(clave, () -> ResponseEntity.badRequest().body("e")).getStatusCode().value()).isEqualTo(400);
        assertThat(idem.ejecutar(clave, () -> ResponseEntity.ok("ok")).getBody()).isEqualTo("ok");
        assertThat(idem.clave("/x", "anon", null, Map.of("a", 2))).isNotEqualTo(clave);
    }

    @Test
    @DisplayName("CMP-2 | cupón que no vale para ningún negocio del carrito → 400 antes de crear el pedido")
    void cuponInvalido() {
        OrderPricingService s = new OrderPricingService();
        CuponService cupones = mock(CuponService.class);
        ReflectionTestUtils.setField(s, "cuponService", cupones);
        when(cupones.validarParaEmpresa(eq("QATEST-NOEXISTE"), any())).thenReturn(Optional.empty());
        when(cupones.validarParaEmpresa(eq("BIEN10"), eq(7L))).thenReturn(Optional.of(new Cupon()));
        assertThatThrownBy(() -> s.exigirCuponValido("QATEST-NOEXISTE", List.of(7L, 8L)))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("cupón");
        assertThatCode(() -> s.exigirCuponValido("BIEN10", List.of(8L, 7L))).doesNotThrowAnyException();
        assertThatCode(() -> s.exigirCuponValido(null, List.of(8L))).doesNotThrowAnyException();
    }
}
