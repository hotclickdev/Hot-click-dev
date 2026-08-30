package com.hotclick.rag.controller.shoppingassistant;

import com.hotclick.model.Empresa;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.catalogo.MarketplaceCatalogo;
import com.hotclick.service.storage.StorageImageValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.IntStream;

/**
 * Búsqueda por imagen del asistente de compras.
 * Extraído bit-idéntico de ShoppingAssistantController — no cambia comportamiento.
 */
@Component
public class ShoppingAssistantImageSearchHandler {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantImageSearchHandler.class);

    private static final int[] SIM_SCORES = { 94, 87, 80, 74, 68 };

    private final ShoppingAssistantTenantGuard tenantGuard;
    private final VectorSearchService          vectorSearchService;
    private final GoogleVisionService          visionService;
    private final StorageImageValidator        imageValidator = new StorageImageValidator();

    ShoppingAssistantImageSearchHandler(ShoppingAssistantTenantGuard tenantGuard,
                                        VectorSearchService vectorSearchService,
                                        GoogleVisionService visionService) {
        this.tenantGuard         = tenantGuard;
        this.vectorSearchService = vectorSearchService;
        this.visionService       = visionService;
    }

    public ResponseEntity<Map<String, Object>> searchByImage(MultipartFile image, String empresaSlug,
                                                             String visitorId) {
        if (image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen está vacía");
        }
        if (image.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen no puede superar 5 MB");
        }
        String ct = image.getContentType();
        if (ct == null || (!ct.startsWith("image/jpeg") && !ct.startsWith("image/png")
                && !ct.startsWith("image/webp") && !ct.startsWith("image/gif"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato no permitido. Usá JPG, PNG o WebP");
        }

        byte[] bytes;
        try {
            bytes = image.getBytes();
        } catch (Exception e) {
            log.warn("[img-search] Error leyendo imagen: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo procesar la imagen");
        }
        if (!imageValidator.esImagenPorContenido(bytes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo no es una imagen válida");
        }

        Empresa empresa = tenantGuard.requireEmpresaActivaForImageSearch(empresaSlug);

        GoogleVisionService.VisionResult vision;
        try {
            String base64 = Base64.getEncoder().encodeToString(bytes);
            vision = visionService.analizar(base64);
        } catch (Exception e) {
            log.warn("[img-search] Error leyendo imagen: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo procesar la imagen");
        }

        // Construir query de texto a partir de las etiquetas de Vision
        String etiquetaPrincipal = vision.getEtiquetaPrincipal();
        String categoriaFisica   = vision.getCategoriaFisica();
        String query = buildImageQuery(vision);

        List<ProductoContexto> productos = query.isBlank()
            ? List.of()
            : vectorSearchService.buscarSimilares(
                empresa.getId(), query, 5, MarketplaceCatalogo.esMarketplace(empresaSlug));

        // Asignar porcentajes de similitud decrecientes (sin image embeddings, es estimación)
        int[] simScores = SIM_SCORES;
        List<Map<String, Object>> productosConSim = IntStream.range(0, productos.size())
            .mapToObj(i -> {
                ProductoContexto p = productos.get(i);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",              p.id());
                m.put("nombre",          p.nombre());
                m.put("sku",             p.sku());
                m.put("precio",          p.precio());
                m.put("descripcionCorta", p.descripcionCorta());
                m.put("imagenUrl",       p.imagenUrl());
                m.put("similarity",      i < simScores.length ? simScores[i] : 60);
                return m;
            })
            .toList();

        Map<String, Object> analisis = new LinkedHashMap<>();
        analisis.put("etiquetaPrincipal", etiquetaPrincipal);
        analisis.put("categoria",         categoriaFisica);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("analisis",   analisis);
        result.put("productos",  productosConSim);
        result.put("encontrado", !productosConSim.isEmpty());

        log.debug("[img-search] empresa={} etiqueta='{}' resultados={}",
            empresa.getId(), etiquetaPrincipal, productosConSim.size());

        return ResponseEntity.ok(result);
    }

    private String buildImageQuery(GoogleVisionService.VisionResult vision) {
        List<String> partes = new ArrayList<>();
        if (!vision.webEntities.isEmpty()) {
            vision.webEntities.stream().limit(3)
                .map(e -> e.description)
                .forEach(partes::add);
        }
        if (!vision.labelsFisicos.isEmpty()) {
            vision.labelsFisicos.stream().limit(2).forEach(partes::add);
        }
        return String.join(" ", partes);
    }
}
