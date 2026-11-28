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
    private final RetencionOnvoRevisionService svc = new RetencionOnvoRevisionService(repo);

    private PedidoRetencionOnvo marca(String estado) {
        PedidoRetencionOnvo m = new PedidoRetencionOnvo();
        m.setPedidoId(5L);
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
    @DisplayName("PLATAFORMA quita la marca")
    void plataforma() {
        marca(PedidoRetencionOnvo.POR_REVISAR);
        assertThat(svc.resolver(5L, "PLATAFORMA")).isEqualTo(Resolucion.RESUELTA);
        verify(repo).borrarPorPedido(5L);
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
