package com.hotclick.controller.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TenantService;
import com.hotclick.service.producto.EmpresaDestinoAlta;
import com.hotclick.service.producto.ProductoIdempotencyService;
import com.hotclick.service.producto.ProductoAltaService;
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

    @Autowired private ProductoAltaService productoAltaService;
    @Autowired private TenantService      tenantService;
    @Autowired private ProductoRequestSanitizer productoRequestSanitizer;
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
            return ResponseEntity.status(403).body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        } catch (IllegalArgumentException | RecursoNoEncontradoException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
        tenantService.verificarLimiteProductos(empresa.getId());
        return persistirAlta(dto, idempotencyKey, empresa);
    }

    private ResponseEntity<ResponseDTO> persistirAlta(
            ProductoRequestDTO dto, String idempotencyKey, Empresa empresa) {
        try {
            var creationResult = productoAltaService.crearYPublicar(dto, currentUserName(), empresa);
            var producto = creationResult.producto();
            productoIdempotencyService.remember(idempotencyKey);
            String mensaje = creationResult.mensaje();
            // El producto ya está confirmado: si solo falla la auditoría la respuesta sigue siendo de éxito
            // (un 400 haría que el cliente reintente y duplique el producto), con un aviso en el mensaje.
            try {
                auditoriaAdminRegistroService.registrarSiAdmin("PRODUCTO_CREADO", "PRODUCTO",
                    producto.getId(), empresa.getId(), "Producto creado: " + producto.getNombreProducto());
            } catch (Exception posterior) {
                org.slf4j.LoggerFactory.getLogger(ProductoCreateHandler.class).error(
                    "[producto-alta] producto {} creado pero falló la auditoría: {}",
                    producto.getId(), posterior.getMessage(), posterior);
                mensaje += " (no se pudo registrar la auditoría; el producto sí quedó creado, no lo vuelvas a crear)";
            }
            return ResponseEntity.ok(ResponseDTO.success(mensaje, creationResult.producto()));
        } catch (ProductoAltaService.ContenidoNoPermitidoException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(productoRequestSanitizer.mensajeAmigable(e)));
        }
    }
}
