package com.hotclick.service.pedido;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Auditoría fb9ef78e P-07 (C1): el pedido manual no usa la bodega 1 fija. */
class PedidoManualBodegaSinIdFijaTest {

    private final BodegaRepository repo = mock(BodegaRepository.class);

    private PedidoManualFactory factory() {
        PedidoManualFactory f = new PedidoManualFactory();
        ReflectionTestUtils.setField(f, "bodegaRepository", repo);
        return f;
    }

    private static Bodega bodega(long id, Long empresaId) {
        Bodega b = new Bodega(); b.setId(id);
        if (empresaId != null) { Empresa e = new Empresa(); e.setId(empresaId); b.setEmpresa(e); }
        return b;
    }

    @Test
    @DisplayName("P-07 | admin de plataforma sin bodega → primera activa de la plataforma, nunca findById(1)")
    void plataformaSinBodega() {
        Bodega b = bodega(30L, Constants.EMPRESA_PLATAFORMA_ID);
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(Constants.EMPRESA_PLATAFORMA_ID, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(b));
        assertThat(factory().resolverBodega(null, null)).isSameAs(b);
        verify(repo, never()).findById(anyLong());
    }

    @Test
    @DisplayName("P-07 | plataforma sin bodegas activas → mensaje claro con voseo")
    void plataformaSinBodegas() {
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(anyLong(), anyInt())).thenReturn(List.of());
        assertThatThrownBy(() -> factory().resolverBodega(null, null))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Elegí una bodega para el pedido.");
    }

    @Test
    @DisplayName("P-07 | bodega explícita inexistente → 404; negocio sin bodega pedida → primera del negocio")
    void explicitaYNegocio() {
        when(repo.findById(77L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> factory().resolverBodega(77L, null)).isInstanceOf(RecursoNoEncontradoException.class);
        Bodega propia = bodega(50L, 7L);
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(7L, Constants.ESTADO_ACTIVO)).thenReturn(List.of(propia));
        assertThat(factory().resolverBodega(null, 7L)).isSameAs(propia);
    }
}
