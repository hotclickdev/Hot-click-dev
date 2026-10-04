package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.UbicacionDespachoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Producto sin bodega")
class ProductoSinBodegaTest {

    @Mock ProductoRepository productoRepository;
    @Mock CategoriaRepository categoriaRepository;
    @Mock BodegaRepository bodegaRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock ProductoDtoMapper dtoMapper;
    @Mock ProductoCacheEvictor cacheEvictor;
    @Mock ProductoGuardadoNotifier guardadoNotifier;
    @Mock UbicacionDespachoService ubicacionDespachoService;

    @InjectMocks ProductoWriteOperations operaciones;

    @Test
    @DisplayName("rechaza el alta aunque venga un bodegaId, si el negocio no tiene bodegas")
    void sinBodegaAunqueMandenId() {
        Empresa empresa = new Empresa();
        empresa.setId(4L);
        when(bodegaRepository.countByEmpresaIdAndEstado(4L, Constants.ESTADO_ACTIVO)).thenReturn(0L);
        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setBodegaId(99L);
        dto.setCategoriaId(1L);

        assertThatThrownBy(() -> operaciones.crearProducto(this, dto, "admin@hotclick.cr", empresa))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(ProductoWriteOperations.MSG_SIN_BODEGA);

        verify(productoRepository, never()).save(any());
        verify(bodegaRepository, never()).findById(eq(99L));
    }
}
