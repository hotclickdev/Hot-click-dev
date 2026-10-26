package com.hotclick.service.sinpe;

import com.hotclick.exception.RateLimitExcedidoException;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** H-07 r2 (a): el tope global por pedido solo cuenta intentos con el correo del dueño. */
@DisplayName("[H-07 r2] Tope por pedido sin bloqueo dirigido")
class SinpeComprobanteTopePedidoTest {

    private SinpeComprobanteService svc;
    private final io.micrometer.core.instrument.simple.SimpleMeterRegistry reg = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
    private final Map<String, Integer> c = new HashMap<>();
    private final MockMultipartFile img = new MockMultipartFile("imagen", "c.png", "image/png", new byte[]{1});

    @BeforeEach
    void setUp() throws Exception {
        svc = new SinpeComprobanteService();
        PedidoRepository repo = mock(PedidoRepository.class);
        Pedido p = mock(Pedido.class);
        Usuario u = mock(Usuario.class);
        when(u.getCorreo()).thenReturn("duena@example.com");
        when(p.getUsuarioFinal()).thenReturn(u);
        when(p.getNumeroPedido()).thenReturn("HC-1001");
        when(p.getEstadoPedido()).thenReturn(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        when(repo.findByNumeroPedido("HC-1001")).thenReturn(Optional.of(p));
        RateLimiter l = mock(RateLimiter.class);
        when(l.tryAcquire(anyString(), anyInt(), anyInt()))
            .thenAnswer(i -> c.merge(i.getArgument(0), 1, Integer::sum) <= (int) i.getArgument(1));
        SupabaseStorageService st = mock(SupabaseStorageService.class);
        when(st.subirImagen(any(), anyString())).thenReturn("https://example.invalid/x.png");
        ReflectionTestUtils.setField(svc, "pedidoRepository", repo);
        ReflectionTestUtils.setField(svc, "rateLimiter", l);
        ReflectionTestUtils.setField(svc, "meterRegistry", reg);
        ReflectionTestUtils.setField(svc, "storageService", st);
        ReflectionTestUtils.setField(svc, "persistenceService", mock(SinpeComprobantePersistenceService.class));
    }

    @Test
    @DisplayName("50 intentos de un atacante con correo ajeno no gastan el cupo de la dueña; el 6.º válido da 429")
    void atacanteNoBloquea() {
        for (int i = 0; i < 50; i++) {
            assertThatThrownBy(() -> svc.subirComprobante("HC-1001", img, "X", null, null, "atacante@example.com"))
                .isInstanceOf(SecurityException.class);
        }
        assertThat(c.keySet()).noneMatch(k -> k.equals("pedido:comprobante:HC-1001"));
        for (int i = 0; i < 5; i++) svc.subirComprobante("HC-1001", img, "Ana", null, null, "duena@example.com");
        assertThatThrownBy(() -> svc.subirComprobante("HC-1001", img, "Ana", null, null, "duena@example.com"))
            .isInstanceOf(RateLimitExcedidoException.class);
        assertThat(c).containsOnlyKeys("pedido:comprobante:HC-1001", "pedido:comprobante:403:HC-1001");
        assertThat(c.get("pedido:comprobante:HC-1001")).isEqualTo(6);
    }

    @Test
    @DisplayName("O-5: los 403 cuentan en Micrometer y al pasar el umbral alertan, sin bloquear; tags sin número")
    void metrica403() {
        ReflectionTestUtils.setField(svc, "alerta403Max", 3);
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> svc.subirComprobante("HC-1001", img, "X", null, null, "atacante@example.com"))
                .isInstanceOf(SecurityException.class);
        }
        assertThat(reg.counter(SinpeComprobanteService.METRICA_403).count()).isEqualTo(5.0);
        assertThat(reg.counter(SinpeComprobanteService.METRICA_403_UMBRAL).count()).isEqualTo(2.0);
        reg.getMeters().forEach(m -> assertThat(m.getId().getTags()).noneMatch(t -> t.getValue().contains("1001")));
        // no bloquea a la dueña
        svc.subirComprobante("HC-1001", img, "Ana", null, null, "duena@example.com");
    }

    @Test
    @DisplayName("O-1: pedido inexistente -> RecursoNoEncontrado con mensaje fijo (sin el input)")
    void inexistente() {
        assertThatThrownBy(() -> svc.subirComprobante("HC-9<x>", img, "X", null, null, "a@example.com"))
            .isInstanceOf(com.hotclick.exception.RecursoNoEncontradoException.class)
            .hasMessage("Pedido no encontrado");
    }
}
