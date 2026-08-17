package com.hotclick.controller.producto;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ProductoService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.producto.ProductoModerationFacade;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Eliminación de productos y subida de imagen del REST API.
 * Extraído bit-idéntico de ProductoWriteHandler — no cambia comportamiento.
 */
@Component
public class ProductoDeleteImagenHandler {

    private static final Logger log = LoggerFactory.getLogger(ProductoDeleteImagenHandler.class);

    @Autowired private ProductoService    productoService;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ProductoAccessGuard productoAccessGuard;
    @Autowired private ProductoModerationFacade productoModerationFacade;

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
}
