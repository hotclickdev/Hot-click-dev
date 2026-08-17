package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ProductoUpdater {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoDtoMapper dtoMapper;
    @Autowired private ProductoCacheEvictor cacheEvictor;
    @Autowired private ProductoGuardadoNotifier guardadoNotifier;

    public Producto actualizarProducto(Object source, Long id, ProductoRequestDTO dto, String adminCorreo) {
        // Leer empresaId una sola vez antes del loop: evita LazyInitializationException
        // al acceder a p.getEmpresa() fuera de transacción (open-in-view=false, empresa=LAZY).
        Long empresaId = productoRepository.findEmpresaIdById(id).orElse(null);
        int intentos = 0;
        while (true) {
            try {
                Producto p = productoRepository.findById(id)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
                dtoMapper.mapDtoToProducto(dto, p);
                if (dto.getCategoriaId() != null) {
                    p.setCategoria(categoriaRepository.findById(dto.getCategoriaId())
                        .orElseThrow(() -> new RecursoNoEncontradoException("Categoría", dto.getCategoriaId())));
                }
                if (dto.getBodegaId() != null) {
                    p.setBodega(bodegaRepository.findById(dto.getBodegaId())
                        .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", dto.getBodegaId())));
                }
                Producto saved = productoRepository.save(p);
                cacheEvictor.evictDashboard(empresaId);
                cacheEvictor.evictProductosPublicos();
                guardadoNotifier.publish(source, saved, empresaId);
                return saved;
            } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
                if (++intentos >= 3) {
                    throw new IllegalStateException("Conflicto de concurrencia al actualizar producto. Intentá de nuevo.");
                }
                try { Thread.sleep(50L * intentos); } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Interrumpido actualizando producto", ie);
                }
            }
        }
    }
}
