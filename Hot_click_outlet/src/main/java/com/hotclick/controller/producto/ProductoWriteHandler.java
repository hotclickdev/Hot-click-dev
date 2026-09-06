package com.hotclick.controller.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.ProductoService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.producto.ProductoApprovalService;
import com.hotclick.service.producto.ProductoBulkOperationsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

import static com.hotclick.controller.producto.ProductoControllerSupport.currentUserName;

/**
 * Endpoints de escritura del REST API de productos.
 * Extraído bit-idéntico de ProductoController — no cambia comportamiento.
 */
@Component
public class ProductoWriteHandler {

    @Autowired private ProductoCreateHandler createHandler;
    @Autowired private ProductoUpdateHandler updateHandler;
    @Autowired private ProductoDeleteImagenHandler deleteImagenHandler;

    @Autowired private ProductoService    productoService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CompanyScope       companyScope;
    @Autowired private ProductoAccessGuard productoAccessGuard;
    @Autowired private ProductoApprovalService productoApprovalService;
    @Autowired private ProductoBulkOperationsService productoBulkOperationsService;
    @Autowired private AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    public ResponseEntity<ResponseDTO> toggleCarrusel(Long id, Map<String, Object> body) {
        try {
            Boolean valor = (Boolean) body.get("enCarrusel");
            Object ordenObj = body.get("orden");
            Integer orden = (ordenObj instanceof Number n) ? n.intValue() : null;
            if (valor == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo enCarrusel requerido"));
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            var producto = productoService.toggleCarrusel(id, valor, orden);
            return ResponseEntity.ok(ResponseDTO.success("Carrusel actualizado", producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> toggleDestacado(Long id, Map<String, Boolean> body) {
        try {
            Boolean valor = body.get("destacado");
            if (valor == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo destacado requerido"));
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            var producto = productoService.toggleDestacado(id, valor);
            return ResponseEntity.ok(ResponseDTO.success("Destacado actualizado", producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> toggleVisibleCatalogo(Long id, Map<String, Boolean> body) {
        try {
            Boolean valor = body.get("visibleCatalogo");
            if (valor == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Campo visibleCatalogo requerido"));
            }
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            var producto = productoService.toggleVisibleCatalogo(id, valor);
            String msg = valor ? "Producto publicado" : "Producto pausado";
            auditoriaAdminRegistroService.registrarSiAdmin("PRODUCTO_VISIBILIDAD", "PRODUCTO",
                id, existente.getEmpresaId(), valor ? "Producto publicado" : "Producto pausado");
            return ResponseEntity.ok(ResponseDTO.success(msg, producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> crearProducto(
            @Valid ProductoRequestDTO dto, String idempotencyKey, Long empresaId) {
        return createHandler.crearProducto(dto, idempotencyKey, empresaId);
    }

    public ResponseEntity<ResponseDTO> actualizarProducto(Long id, ProductoRequestDTO dto) {
        return updateHandler.actualizarProducto(id, dto);
    }

    public ResponseEntity<ResponseDTO> archivarSinStock() {
        try {
            int archivados = productoBulkOperationsService.archivarSinStock();
            return ResponseEntity.ok(ResponseDTO.success(archivados + " productos desactivados", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> ajustarPrecios(Map<String, Double> body) {
        try {
            double pct = body.getOrDefault("porcentaje", 0.0);
            if (pct == 0) return ResponseEntity.badRequest().body(ResponseDTO.error("Porcentaje requerido"));
            int actualizados = productoBulkOperationsService.ajustarPrecios(pct);
            return ResponseEntity.ok(ResponseDTO.success(actualizados + " productos actualizados", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> importarBulk(List<ProductoRequestDTO> dtos) {
        if (dtos == null || dtos.size() > 200)
            return ResponseEntity.badRequest().body(ResponseDTO.error("El bulk acepta entre 1 y 200 productos por lote"));
        var result = productoBulkOperationsService.importar(dtos, currentUserName());
        return ResponseEntity.ok(ResponseDTO.success(result.mensaje(), result.data()));
    }

    public ResponseEntity<ResponseDTO> subirImagen(MultipartFile file) {
        return deleteImagenHandler.subirImagen(file);
    }

    public ResponseEntity<ResponseDTO> eliminarProducto(Long id) {
        return deleteImagenHandler.eliminarProducto(id);
    }

    /** Aplicar/quitar oferta a un producto individual */
    public ResponseEntity<ResponseDTO> aplicarOferta(Long id, Map<String, Object> body) {
        try {
            Producto p = productoAccessGuard.getAccessibleProducto(id);
            boolean enOferta = Boolean.TRUE.equals(body.get("enOferta"));
            Integer pct = body.get("porcentajeDescuento") != null
                ? ((Number) body.get("porcentajeDescuento")).intValue() : null;
            Integer precio = body.get("precioOferta") != null
                ? ((Number) body.get("precioOferta")).intValue() : null;

            // Solo se modera aplicar una promo nueva; quitarla (enOferta=false) es
            // reversible y de bajo riesgo, se aplica al instante para cualquier rol.
            var approvalResult = productoApprovalService
                .solicitarAprobacionOfertaSiCorresponde(p, id, enOferta, pct, precio);
            if (approvalResult.isPresent()) {
                var result = approvalResult.get();
                if (result.statusCode() == 409) {
                    return ResponseEntity.status(409).body(ResponseDTO.error(result.mensaje()));
                }
                return ResponseEntity.ok(ResponseDTO.success(result.mensaje(), result.data()));
            }

            Producto actualizado = productoService.aplicarOferta(id, enOferta, pct, precio);
            return ResponseEntity.ok(ResponseDTO.success("Oferta actualizada", actualizado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Aplicar oferta a todos los productos de una categoría */
    public ResponseEntity<ResponseDTO> aplicarOfertaCategoria(Long categoriaId, Map<String, Object> body) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            boolean enOferta = Boolean.TRUE.equals(body.get("enOferta"));
            Integer pct = body.get("porcentajeDescuento") != null
                ? ((Number) body.get("porcentajeDescuento")).intValue() : null;
            List<Producto> productos = empresaId != null
                ? productoRepository.findByCategoriaIdAndEmpresaId(categoriaId, empresaId)
                : productoRepository.findByCategoriaId(categoriaId);
            for (Producto p : productos) {
                p.setEnOferta(enOferta);
                if (enOferta && pct != null && pct > 0) {
                    p.setPorcentajeDescuento(pct);
                    p.setPrecioOferta((int) Math.round(p.getPrecioVenta() * (1 - pct / 100.0)));
                } else if (!enOferta) {
                    p.setPrecioOferta(null);
                    p.setPorcentajeDescuento(null);
                }
            }
            productoRepository.saveAll(productos);
            return ResponseEntity.ok(ResponseDTO.success("Oferta aplicada a " + productos.size() + " productos", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
