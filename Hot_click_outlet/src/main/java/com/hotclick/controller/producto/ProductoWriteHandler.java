package com.hotclick.controller.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ProductoService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TenantService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.producto.ProductoApprovalService;
import com.hotclick.service.producto.ProductoBulkOperationsService;
import com.hotclick.service.producto.ProductoIdempotencyService;
import com.hotclick.service.producto.ProductoModerationFacade;
import com.hotclick.service.producto.ProductoRequestSanitizer;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
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

    private static final Logger log = LoggerFactory.getLogger(ProductoWriteHandler.class);

    @Autowired private ProductoService    productoService;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CompanyScope       companyScope;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private TenantService      tenantService;
    @Autowired private ProductoAccessGuard productoAccessGuard;
    @Autowired private ProductoModerationFacade productoModerationFacade;
    @Autowired private ProductoRequestSanitizer productoRequestSanitizer;
    @Autowired private ProductoApprovalService productoApprovalService;
    @Autowired private ProductoIdempotencyService productoIdempotencyService;
    @Autowired private ProductoBulkOperationsService productoBulkOperationsService;

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

    public ResponseEntity<ResponseDTO> crearProducto(@Valid ProductoRequestDTO dto, String idempotencyKey) {
        // Idempotencia: misma clave = mismo tab o doble-clic → 409 en vez de duplicar (#17)
        if (productoIdempotencyService.isDuplicate(idempotencyKey)) {
            return ResponseEntity.status(409)
                .body(ResponseDTO.error("Este producto ya fue publicado. Actualizá la página."));
        }
        // Verificación de límite de plan — propaga PlanLimitException → GlobalExceptionHandler (HTTP 403)
        Long eid = companyScope.getCurrentEmpresaIdOrOwn();
        if (eid != null) tenantService.verificarLimiteProductos(eid);

        productoRequestSanitizer.restringirCamposSoloAdmin(dto, productoAccessGuard.hasRole("ADMIN"));
        try {
            if (!productoModerationFacade.isTextoPermitido(dto))
                return ResponseEntity.badRequest().body(ResponseDTO.error("El contenido del producto no está permitido en la plataforma"));
            Empresa empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;
            var producto = productoService.crearProducto(dto, currentUserName(), empresa);
            productoIdempotencyService.remember(idempotencyKey);
            var creationResult = productoApprovalService.aplicarReglasPublicacion(producto, empresa);
            return ResponseEntity.ok(ResponseDTO.success(creationResult.mensaje(), creationResult.producto()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(productoRequestSanitizer.mensajeAmigable(e)));
        }
    }

    public ResponseEntity<ResponseDTO> actualizarProducto(Long id, ProductoRequestDTO dto) {
        try {
            productoAccessGuard.assertCanAccessProducto(id);
            productoRequestSanitizer.restringirCamposSoloAdmin(dto, productoAccessGuard.hasRole("ADMIN"));
            if (!productoModerationFacade.isTextoPermitido(dto))
                return ResponseEntity.badRequest().body(ResponseDTO.error("El contenido del producto no está permitido en la plataforma"));
            var producto = productoService.actualizarProducto(id, dto, currentUserName());
            return ResponseEntity.ok(ResponseDTO.success("Producto actualizado", producto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(productoRequestSanitizer.mensajeAmigable(e)));
        }
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
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        try {
            var mod = productoModerationFacade.moderarImagen(file);
            if (!mod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Imagen rechazada: " + mod.reason()));
            String url = supabaseStorageService.subirImagen(file);
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[productos/imagen] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir imagen: " + e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> eliminarProducto(Long id) {
        try {
            productoAccessGuard.assertCanAccessProducto(id);
            productoService.eliminarProducto(id);
            return ResponseEntity.ok(ResponseDTO.success("Producto eliminado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
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
