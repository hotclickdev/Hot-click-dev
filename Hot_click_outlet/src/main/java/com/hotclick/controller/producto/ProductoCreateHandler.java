package com.hotclick.controller.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ProductoService;
import com.hotclick.service.TenantService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.producto.ProductoApprovalService;
import com.hotclick.service.producto.ProductoIdempotencyService;
import com.hotclick.service.producto.ProductoModerationFacade;
import com.hotclick.service.producto.ProductoRequestSanitizer;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import static com.hotclick.controller.producto.ProductoControllerSupport.currentUserName;

/**
 * Creación de productos del REST API.
 * Extraído bit-idéntico de ProductoWriteHandler — no cambia comportamiento.
 */
@Component
public class ProductoCreateHandler {

    @Autowired private ProductoService    productoService;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private CompanyScope       companyScope;
    @Autowired private TenantService      tenantService;
    @Autowired private ProductoAccessGuard productoAccessGuard;
    @Autowired private ProductoModerationFacade productoModerationFacade;
    @Autowired private ProductoRequestSanitizer productoRequestSanitizer;
    @Autowired private ProductoApprovalService productoApprovalService;
    @Autowired private ProductoIdempotencyService productoIdempotencyService;

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
}
