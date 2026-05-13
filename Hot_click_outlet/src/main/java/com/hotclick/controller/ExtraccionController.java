package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.BccrService;
import com.hotclick.service.ExtraccionService;
import com.hotclick.service.ExtraccionService.ResultadoExtraccion;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.PrecioSugeridoService;
import com.hotclick.service.PublicacionFacebookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/extraccion")
public class ExtraccionController {

    @Autowired private GoogleVisionService visionService;
    @Autowired private ExtraccionService extraccionService;
    @Autowired private PrecioSugeridoService precioService;
    @Autowired private PublicacionFacebookService publicacionService;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private BccrService bccrService;

    /**
     * Analiza una imagen y extrae precios de ecommerce.
     * Si se pasa productoId, guarda los precios en BD y genera entrada FB.
     */
    @PostMapping("/analizar")
    public ResponseEntity<ResponseDTO> analizar(
            @RequestParam MultipartFile imagen,
            @RequestParam(required = false) Long productoId) {
        try {
            if (imagen.isEmpty()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("La imagen es requerida"));
            }
            String ct = imagen.getContentType();
            if (ct == null || !ct.startsWith("image/")) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("El archivo debe ser una imagen"));
            }

            String base64 = Base64.getEncoder().encodeToString(imagen.getBytes());
            ResultadoExtraccion resultado = extraccionService.extraer(base64, visionService);

            if (productoId != null) {
                Producto producto = productoRepo.findById(productoId)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoId));
                precioService.guardarPrecios(producto, resultado);
                publicacionService.crearOActualizar(productoId, null);
            }

            return ResponseEntity.ok(ResponseDTO.success("Análisis completado", resultado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Devuelve el tipo de cambio USD→CRC actual del BCCR. */
    @GetMapping("/tipo-cambio")
    public ResponseEntity<ResponseDTO> tipoCambio() {
        int tc = bccrService.getTipoCambioVenta();
        return ResponseEntity.ok(ResponseDTO.success("Tipo de cambio", Map.of("tipoCambio", tc)));
    }
}
