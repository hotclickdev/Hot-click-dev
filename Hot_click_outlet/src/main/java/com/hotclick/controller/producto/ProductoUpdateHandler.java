package com.hotclick.controller.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ProductoService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.producto.ProductoModerationFacade;
import com.hotclick.service.producto.ProductoRequestSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import static com.hotclick.controller.producto.ProductoControllerSupport.currentUserName;

/**
 * Actualización de productos del REST API.
 * Extraído bit-idéntico de ProductoWriteHandler — no cambia comportamiento.
 */
@Component
public class ProductoUpdateHandler {

    @Autowired private ProductoService    productoService;
    @Autowired private ProductoAccessGuard productoAccessGuard;
    @Autowired private ProductoModerationFacade productoModerationFacade;
    @Autowired private ProductoRequestSanitizer productoRequestSanitizer;

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
}
