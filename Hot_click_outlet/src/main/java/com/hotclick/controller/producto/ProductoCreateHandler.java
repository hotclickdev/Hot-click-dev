package com.hotclick.controller.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.ProductoService;
import com.hotclick.service.TenantService;
import com.hotclick.service.producto.EmpresaDestinoAlta;
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
 * ADMIN de plataforma debe indicar empresaId; el vendedor usa la de su sesión.
 */
@Component
public class ProductoCreateHandler {

    @Autowired private ProductoService    productoService;
    @Autowired private TenantService      tenantService;
    @Autowired private ProductoAccessGuard productoAccessGuard;
    @Autowired private ProductoModerationFacade productoModerationFacade;
    @Autowired private ProductoRequestSanitizer productoRequestSanitizer;
    @Autowired private ProductoApprovalService productoApprovalService;
    @Autowired private ProductoIdempotencyService productoIdempotencyService;
    @Autowired private EmpresaDestinoAlta empresaDestinoAlta;
    @Autowired private AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    public ResponseEntity<ResponseDTO> crearProducto(
            @Valid ProductoRequestDTO dto, String idempotencyKey, Long empresaId) {
        if (productoIdempotencyService.isDuplicate(idempotencyKey)) {
            return ResponseEntity.status(409)
                .body(ResponseDTO.error("Este producto ya fue publicado. Actualizá la página."));
        }
        Empresa empresa;
        try {
            empresa = empresaDestinoAlta.resolver(empresaId);
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | RecursoNoEncontradoException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
        tenantService.verificarLimiteProductos(empresa.getId());
        return persistirAlta(dto, idempotencyKey, empresa);
    }

    private ResponseEntity<ResponseDTO> persistirAlta(
            ProductoRequestDTO dto, String idempotencyKey, Empresa empresa) {
        productoRequestSanitizer.restringirCamposSoloAdmin(dto, productoAccessGuard.hasRole("ADMIN"));
        try {
            if (!productoModerationFacade.isTextoPermitido(dto)) {
                return ResponseEntity.badRequest()
                    .body(ResponseDTO.error("El contenido del producto no está permitido en la plataforma"));
            }
            var producto = productoService.crearProducto(dto, currentUserName(), empresa);
            productoIdempotencyService.remember(idempotencyKey);
            var creationResult = productoApprovalService.aplicarReglasPublicacion(producto, empresa);
            auditoriaAdminRegistroService.registrarSiAdmin("PRODUCTO_CREADO", "PRODUCTO",
                producto.getId(), empresa.getId(), "Producto creado: " + producto.getNombreProducto());
            return ResponseEntity.ok(ResponseDTO.success(creationResult.mensaje(), creationResult.producto()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(productoRequestSanitizer.mensajeAmigable(e)));
        }
    }
}
