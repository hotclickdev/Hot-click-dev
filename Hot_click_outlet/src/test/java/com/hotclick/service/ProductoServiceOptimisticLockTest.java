package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F35-04 — ProductoService.actualizarProducto(): retry loop OptimisticLock.
 *
 * Verifica:
 * - Fallo una vez → reintento exitoso en el 2do intento
 * - Fallo 3 veces → RuntimeException "Conflicto de concurrencia"
 * - Sin conflicto → éxito directo (1 intento)
 * - empresaId leído antes del loop (fix LAZY)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F35-04 — ProductoService: OptimisticLock retry (máx 3 intentos)")
class ProductoServiceOptimisticLockTest {

    @Mock ProductoRepository  productoRepository;
    @Mock CategoriaRepository categoriaRepository;
    @Mock BodegaRepository    bodegaRepository;
    @Mock UsuarioRepository   usuarioRepository;
    @Mock MarcaRepository     marcaRepository;
    @Mock CacheManager        cacheManager;
    @Mock InputSanitizer      sanitizer;
    @Mock ApplicationEventPublisher eventPublisher;

    @InjectMocks ProductoService service;

    private Producto producto;
    private ProductoRequestDTO dto;

    @BeforeEach
    void setUp() {
        producto = new Producto();
        producto.setNombreProducto("Original");
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(5000);
        producto.setStockActual(10);

        dto = new ProductoRequestDTO();
        dto.setNombreProducto("Actualizado");
        dto.setPrecioVenta(12000);

        // empresaId leído antes del loop (evita LAZY fuera de TX)
        when(productoRepository.findEmpresaIdById(1L)).thenReturn(Optional.of(99L));
        // cache eviction mock
        when(cacheManager.getCache("dashboard-metricas")).thenReturn(null);
    }

    // ── Caso feliz: sin conflicto ─────────────────────────────────────────────

    @Test
    @DisplayName("Sin OptimisticLock → éxito en 1 intento")
    void actualizar_noConflict_successIn1Try() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(productoRepository.save(any())).thenReturn(producto);

        Producto result = service.actualizarProducto(1L, dto, "admin@test.cr");

        assertThat(result).isNotNull();
        verify(productoRepository, times(1)).findById(1L);
        verify(productoRepository, times(1)).save(any());
    }

    // ── Caso concurrencia: falla 1 vez, éxito en el 2do intento ──────────────

    @Test
    @DisplayName("OptimisticLock en 1er intento → reintenta → éxito en 2do")
    void actualizar_failOnce_retriesSuccessfully() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(productoRepository.save(any()))
            .thenThrow(new ObjectOptimisticLockingFailureException(Producto.class, 1L))
            .thenReturn(producto);

        Producto result = service.actualizarProducto(1L, dto, "admin@test.cr");

        assertThat(result).isNotNull();
        // findById llamado 2 veces (una por intento)
        verify(productoRepository, times(2)).findById(1L);
        verify(productoRepository, times(2)).save(any());
    }

    // ── Caso concurrencia extrema: falla 3 veces → excepción ─────────────────

    @Test
    @DisplayName("OptimisticLock 3 veces → RuntimeException 'Conflicto de concurrencia'")
    void actualizar_fail3Times_throwsRuntimeException() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(productoRepository.save(any()))
            .thenThrow(new ObjectOptimisticLockingFailureException(Producto.class, 1L))
            .thenThrow(new ObjectOptimisticLockingFailureException(Producto.class, 1L))
            .thenThrow(new ObjectOptimisticLockingFailureException(Producto.class, 1L));

        assertThatThrownBy(() -> service.actualizarProducto(1L, dto, "admin@test.cr"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Conflicto de concurrencia");

        // 3 intentos exactos
        verify(productoRepository, times(3)).findById(1L);
        verify(productoRepository, times(3)).save(any());
    }

    // ── Caso: producto no encontrado ──────────────────────────────────────────

    @Test
    @DisplayName("Producto no encontrado → RuntimeException 'no encontrado'")
    void actualizar_productoNotFound_throwsException() {
        when(productoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizarProducto(999L, dto, "admin@test.cr"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("no encontrado");
    }

    // ── Fix LAZY: empresaId leído antes del loop ──────────────────────────────

    @Test
    @DisplayName("findEmpresaIdById() llamado UNA vez antes del retry loop (fix LAZY)")
    void actualizar_empresaIdReadOnceBeforeLoop() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(productoRepository.save(any()))
            .thenThrow(new ObjectOptimisticLockingFailureException(Producto.class, 1L))
            .thenReturn(producto);

        service.actualizarProducto(1L, dto, "admin@test.cr");

        // findEmpresaIdById solo se llama 1 vez (antes del loop, no en cada intento)
        verify(productoRepository, times(1)).findEmpresaIdById(1L);
    }
}
