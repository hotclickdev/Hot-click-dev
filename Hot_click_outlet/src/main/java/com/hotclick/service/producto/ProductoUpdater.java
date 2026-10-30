package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Producto;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ProductoUpdater {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaTenantGuard bodegaTenantGuard;
    @Autowired private ProductoDtoMapper dtoMapper;
    @Autowired private ProductoCacheEvictor cacheEvictor;
    @Autowired private ProductoGuardadoNotifier guardadoNotifier;
    @Autowired private ProductoCambioAuditoria cambioAuditoria;
    @Autowired(required = false) private com.hotclick.service.contacto.ContactoPublicoService contactoPublico;

    public Producto actualizarProducto(Object source, Long id, ProductoRequestDTO dto, String adminCorreo) {
        // Leer empresaId una sola vez antes del loop: evita LazyInitializationException
        // al acceder a p.getEmpresa() fuera de transacción (open-in-view=false, empresa=LAZY).
        Long empresaId = productoRepository.findEmpresaIdById(id).orElse(null);
        int intentos = 0;
        while (true) {
            try {
                Producto p = productoRepository.findById(id)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
                // La bodega se valida antes de tocar la entidad: una bodega de otro negocio no se asigna (ni se lee).
                Bodega bodegaNueva = dto.getBodegaId() != null
                    ? bodegaTenantGuard.exigirDeLaEmpresa(dto.getBodegaId(), empresaId) : null;
                String nombreAntes = p.getNombreProducto();
                Integer precioAntes = p.getPrecioVenta();
                Integer stockAntes = p.getStockActual();
                if (contactoPublico != null && dto.getVideoUrl() != null) {
                    com.hotclick.utils.VideoUrlPermitida.exigirSegunPlan(dto.getVideoUrl(), contactoPublico.permiteContacto(empresaId));
                }
                dtoMapper.mapDtoToProducto(dto, p);
                if (dto.getCategoriaId() != null) {
                    p.setCategoria(categoriaRepository.findById(dto.getCategoriaId())
                        .orElseThrow(() -> new RecursoNoEncontradoException("Categoría", dto.getCategoriaId())));
                }
                if (bodegaNueva != null) {
                    p.setBodega(bodegaNueva);
                }
                Producto saved = productoRepository.save(p);
                cambioAuditoria.anotar(saved, empresaId, nombreAntes, precioAntes, stockAntes);
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
