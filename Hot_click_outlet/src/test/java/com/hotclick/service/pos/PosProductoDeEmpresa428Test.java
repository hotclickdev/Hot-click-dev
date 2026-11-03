package com.hotclick.service.pos;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("#428 MEDIO-2 / BAJO-1 | oráculo de existencia y lock solo sobre productos propios")
class PosProductoDeEmpresa428Test {

    private final ProductoRepository repo = mock(ProductoRepository.class);

    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); return e; }

    @Test
    @DisplayName("BAJO-1: un producto ajeno NUNCA se bloquea (FOR UPDATE) y da el mismo 404 que uno inexistente")
    void ajenoNoSeBloquea() {
        when(repo.findEmpresaIdById(11L)).thenReturn(Optional.of(2L));
        when(repo.findEmpresaIdById(404L)).thenReturn(Optional.empty());
        Throwable a = catchThrowable(() -> PosProductoDeEmpresa.bloqueandoSoloSiEsDelNegocio(repo, 11L, 1L));
        Throwable n = catchThrowable(() -> PosProductoDeEmpresa.bloqueandoSoloSiEsDelNegocio(repo, 404L, 1L));
        assertThat(a).isInstanceOf(RecursoNoEncontradoException.class).hasMessage("Producto no encontrado");
        assertThat(n).isInstanceOf(a.getClass()).hasMessage(a.getMessage());
        verify(repo, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("BAJO-1: un producto propio se bloquea y se devuelve")
    void propioSeBloquea() {
        Producto p = new Producto(); p.setId(10L); p.setEmpresa(empresa(1L));
        when(repo.findEmpresaIdById(10L)).thenReturn(Optional.of(1L));
        when(repo.findByIdForUpdate(10L)).thenReturn(Optional.of(p));
        assertThat(PosProductoDeEmpresa.bloqueandoSoloSiEsDelNegocio(repo, 10L, 1L)).isSameAs(p);
    }

    @Test
    @DisplayName("MEDIO-2: si cambia de dueño entre la lectura y el lock, también 404 fijo")
    void cambioDeDuenoTrasLock() {
        Producto p = new Producto(); p.setId(10L); p.setEmpresa(empresa(2L));
        when(repo.findEmpresaIdById(10L)).thenReturn(Optional.of(1L));
        when(repo.findByIdForUpdate(10L)).thenReturn(Optional.of(p));
        assertThat(catchThrowable(() -> PosProductoDeEmpresa.bloqueandoSoloSiEsDelNegocio(repo, 10L, 1L)))
            .isInstanceOf(RecursoNoEncontradoException.class).hasMessage("Producto no encontrado");
    }

    @Test
    @DisplayName("MEDIO-2: bodega ajena e inexistente dan el mismo 404 de texto fijo, sin id")
    void bodegaSinOraculo() {
        Bodega ajena = new Bodega(); ajena.setId(3L); ajena.setEmpresa(empresa(2L));
        Throwable a = catchThrowable(() -> PosProductoDeEmpresa.ocultandoExistenciaBodega(ajena, 3L, 1L));
        Throwable n = catchThrowable(() -> PosProductoDeEmpresa.ocultandoExistenciaBodega(null, 3L, 1L));
        assertThat(a).isInstanceOf(RecursoNoEncontradoException.class).hasMessage(PosProductoDeEmpresa.MENSAJE_BODEGA_NO_ENCONTRADA);
        assertThat(n).isInstanceOf(a.getClass()).hasMessage(a.getMessage());
        assertThat(a.getMessage()).doesNotContain("3");
        Bodega propia = new Bodega(); propia.setId(3L); propia.setEmpresa(empresa(1L));
        assertThat(PosProductoDeEmpresa.ocultandoExistenciaBodega(propia, 3L, 1L)).isSameAs(propia);
    }
}
