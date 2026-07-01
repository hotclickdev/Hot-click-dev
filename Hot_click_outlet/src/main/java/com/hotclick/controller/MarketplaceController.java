package com.hotclick.controller;

import com.hotclick.dto.marketplace.ProductoMarketplaceDTO;
import com.hotclick.model.CatalogoMaestro;
import com.hotclick.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    public MarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    // ─── Público: búsqueda con Buy Box ───────────────────────────────────────
    //
    // GET /api/marketplace/buscar?q=shimano+deore&provincia=San+José&canton=Santa+Ana&page=0&size=20
    //
    // - q: término de búsqueda (vacío = mostrar todos)
    // - provincia / canton: ubicación del cliente para calcular cercanía (opcionales)
    // - Devuelve una sola tarjeta por producto físico, con el mejor vendedor al frente
    //
    @GetMapping("/marketplace/buscar")
    public ResponseEntity<Map<String, Object>> buscar(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "") String provincia,
            @RequestParam(required = false, defaultValue = "") String canton,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        size = Math.min(size, 100); // cap por seguridad
        return ResponseEntity.ok(marketplaceService.buscar(q, provincia, canton, page, size));
    }

    // ─── Público: detalle de un catálogo con Buy Box + alternativas ───────────
    //
    // GET /api/marketplace/productos/42?provincia=San+José&canton=Santa+Ana
    //
    // Respuesta:
    //   { catalogoId, nombre, ..., vendedorPrincipal: {...}, alternativas: [...] }
    //
    @GetMapping("/marketplace/productos/{catalogoId}")
    public ResponseEntity<ProductoMarketplaceDTO> detalle(
            @PathVariable Long catalogoId,
            @RequestParam(required = false, defaultValue = "") String provincia,
            @RequestParam(required = false, defaultValue = "") String canton) {

        return ResponseEntity.ok(marketplaceService.detalle(catalogoId, provincia, canton));
    }

    // ─── Admin: crear entrada en catálogo maestro ─────────────────────────────
    //
    // POST /api/admin/marketplace/catalogo
    // Body: { nombre, descripcionCorta, skuFabricante, codigoBarras, modelo, ... }
    //
    // Útil cuando el admin quiere normalizar manualmente un producto antes de que
    // algún vendedor lo suba (ej: preparar el catálogo con fotos oficiales).
    //
    @PostMapping("/admin/marketplace/catalogo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CatalogoMaestro> crear(@RequestBody CatalogoMaestro body) {
        return ResponseEntity.ok(marketplaceService.guardar(body));
    }

    // ─── Admin: actualizar entrada existente ──────────────────────────────────
    //
    // PUT /api/admin/marketplace/catalogo/42
    // Solo actualiza los campos que vengan en el body (patch semántico).
    //
    @PutMapping("/admin/marketplace/catalogo/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CatalogoMaestro> actualizar(
            @PathVariable Long id,
            @RequestBody CatalogoMaestro body) {

        return ResponseEntity.ok(marketplaceService.actualizar(id, body));
    }
}
