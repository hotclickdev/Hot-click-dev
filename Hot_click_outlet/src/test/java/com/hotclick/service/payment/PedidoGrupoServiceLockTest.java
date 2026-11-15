package com.hotclick.service.payment;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("PedidoGrupoService | bloquearGrupo / bloquearPedidos: flush → lock ORDER BY id → refresh, fail-closed")
class PedidoGrupoServiceLockTest {

    private PedidoRepository repo;
    private EntityManager em;
    private PedidoGrupoService svc;

    private static Pedido pedido(long id, String grupo) {
        Pedido p = new Pedido();
        p.setId(id);
        p.setGrupoPago(grupo);
        return p;
    }

    @BeforeEach
    void armar() {
        repo = mock(PedidoRepository.class);
        em = mock(EntityManager.class);
        svc = new PedidoGrupoService(repo, mock(PagoRepository.class));
        ReflectionTestUtils.setField(svc, "entityManager", em);
    }

    @Test
    @DisplayName("bloquearGrupo con grupo: flush → lock por grupo → refresh de cada pedido")
    void conGrupo() {
        Pedido a = pedido(1, "g"), b = pedido(2, "g");
        when(repo.findByGrupoPagoForUpdateOrderById("g")).thenReturn(List.of(a, b));

        assertThat(svc.bloquearGrupo(a)).containsExactly(a, b);

        InOrder o = inOrder(em, repo);
        o.verify(em).flush();
        o.verify(repo).findByGrupoPagoForUpdateOrderById("g");
        o.verify(em).refresh(a);
        o.verify(em).refresh(b);
    }

    @Test
    @DisplayName("bloquearGrupo sin grupo: solo el pedido por id")
    void sinGrupo() {
        Pedido a = pedido(9, null);
        when(repo.findByIdForUpdate(9L)).thenReturn(Optional.of(a));
        assertThat(svc.bloquearGrupo(a)).containsExactly(a);
        verify(repo, never()).findByGrupoPagoForUpdateOrderById(any());
    }

    @Test
    @DisplayName("bloquearGrupo: pedido base ausente del lock → aborta sin refrescar")
    void baseAusente() {
        Pedido a = pedido(1, "g");
        when(repo.findByGrupoPagoForUpdateOrderById("g")).thenReturn(List.of(pedido(2, "g")));
        assertThatThrownBy(() -> svc.bloquearGrupo(a)).isInstanceOf(IllegalStateException.class);
        verify(em, never()).refresh(any());
    }

    @Test
    @DisplayName("bloquearPedidos: una consulta con ids únicos y ordenados; ausente → aborta")
    void bloquearPedidos() {
        Pedido a = pedido(5, "x"), b = pedido(3, "y");
        when(repo.findAllByIdForUpdateOrderById(List.of(3L, 5L))).thenReturn(List.of(b, a));

        assertThat(svc.bloquearPedidos(List.of(a, b, a))).containsExactly(b, a);
        verify(repo, times(1)).findAllByIdForUpdateOrderById(List.of(3L, 5L));
        verify(em).refresh(a);
        verify(em).refresh(b);

        when(repo.findAllByIdForUpdateOrderById(List.of(3L, 5L))).thenReturn(List.of(b));
        assertThatThrownBy(() -> svc.bloquearPedidos(List.of(a, b))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("bloquearPedidos: vacío no toca la base; pedido sin id → aborta")
    void vacioYSinId() {
        assertThat(svc.bloquearPedidos(List.of())).isEmpty();
        verifyNoInteractions(repo);
        assertThatThrownBy(() -> svc.bloquearPedidos(List.of(new Pedido()))).isInstanceOf(IllegalStateException.class);
    }
}
