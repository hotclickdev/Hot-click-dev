package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.PedidoRetencionOnvo;
import com.hotclick.repository.PedidoRetencionOnvoRepository;
import com.hotclick.service.onvo.cuenta.RetencionOnvoRevisionService.Resolucion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("Cola de retenciones POR_REVISAR: solo ADMIN la resuelve y nada acredita solo")
class RetencionOnvoRevisionServiceTest {

    private final PedidoRetencionOnvoRepository repo = mock(PedidoRetencionOnvoRepository.class);
    private final com.hotclick.service.OnvoService onvo = mock(com.hotclick.service.OnvoService.class);
    private final RetencionOnvoRevisionService svc = new RetencionOnvoRevisionService(repo, onvo);

    private PedidoRetencionOnvo marca(String estado) {
        PedidoRetencionOnvo m = new PedidoRetencionOnvo();
        m.setPedidoId(5L);
        m.setOnvoSessionId("cs_5");
        m.setEstado(estado);
        when(repo.findByPedidoId(5L)).thenReturn(Optional.of(m));
        return m;
    }

    @Test
    @DisplayName("CONFIRMAR_RETENIDA deja la marca como RETENIDA")
    void confirmar() {
        PedidoRetencionOnvo m = marca(PedidoRetencionOnvo.POR_REVISAR);
        assertThat(svc.resolver(5L, "CONFIRMAR_RETENIDA")).isEqualTo(Resolucion.RESUELTA);
        assertThat(m.getEstado()).isEqualTo(PedidoRetencionOnvo.RETENIDA);
        verify(repo).save(m);
    }

    @Test
    @DisplayName("PLATAFORMA: solo si ONVO confirma por GET que la sesión fue sin onBehalfOf; entonces quita la marca")
    void plataformaConfirmada() {
        marca(PedidoRetencionOnvo.POR_REVISAR);
        java.util.Map<String, Object> sinCuenta = new java.util.HashMap<>();
        sinCuenta.put("onBehalfOfId", null);
        doReturn(sinCuenta).when(onvo).obtenerCheckoutSession("cs_5");
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.RESUELTA);
        verify(repo).borrarPorPedido(5L);
    }

    @Test
    @DisplayName("PLATAFORMA con una sesión que ONVO cobró a nombre del negocio: se rechaza (409) y no se borra nada")
    void plataformaRechazadaSiPagoAlNegocio() {
        marca(PedidoRetencionOnvo.POR_REVISAR);
        doReturn(java.util.Map.of("onBehalfOfId", "cl_abc123")).when(onvo).obtenerCheckoutSession("cs_5");
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.ONVO_PAGO_AL_NEGOCIO);
        verify(repo, never()).borrarPorPedido(anyLong());
    }

    @Test
    @DisplayName("PLATAFORMA sin confirmación (sin la clave, sesión vacía o ONVO caído): no se borra")
    void plataformaSinConfirmacion() {
        marca(PedidoRetencionOnvo.POR_REVISAR);
        doReturn(java.util.Map.of("paymentStatus", "paid")).when(onvo).obtenerCheckoutSession("cs_5");
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.NO_CONFIRMADO);
        doReturn(java.util.Map.of()).when(onvo).obtenerCheckoutSession("cs_5");
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.NO_CONSULTABLE);
        when(onvo.obtenerCheckoutSession("cs_5")).thenThrow(new IllegalStateException("x"));
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.NO_CONSULTABLE);
        verify(repo, never()).borrarPorPedido(anyLong());
    }

    @Test
    @DisplayName("Decisión inválida, o marca que no está por revisar: no cambia nada")
    void invalidas() {
        PedidoRetencionOnvo m = marca(PedidoRetencionOnvo.POR_REVISAR);
        assertThat(svc.resolver(5L, "OTRA")).isEqualTo(Resolucion.DECISION_INVALIDA);
        m.setEstado(PedidoRetencionOnvo.RETENIDA);
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.NO_HAY);
        verify(repo, never()).borrarPorPedido(anyLong());
        verify(repo, never()).save(any());
    }
}
