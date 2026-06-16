package com.hotclick.service;

import com.hotclick.dto.marketplace.CatalogoCardDTO;
import com.hotclick.dto.marketplace.ProductoMarketplaceDTO;
import com.hotclick.dto.marketplace.VendedorOfertaDTO;
import com.hotclick.model.CatalogoMaestro;
import com.hotclick.model.Producto;
import com.hotclick.repository.CatalogoMaestroRepository;
import com.hotclick.repository.CatalogoMaestroRepository.VendedorOfertaProjection;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@SuppressWarnings("null") // Spring Data @NonNull annotations are internal contracts, not runtime risk
@Service
public class MarketplaceService {

    private final CatalogoMaestroRepository catalogoRepo;
    private final InputSanitizer            sanitizer;

    public MarketplaceService(CatalogoMaestroRepository catalogoRepo, InputSanitizer sanitizer) {
        this.catalogoRepo = catalogoRepo;
        this.sanitizer    = sanitizer;
    }

    // ─── Búsqueda paginada con Buy Box ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> buscar(String q, String provincia, String canton, int page, int size) {
        String termino  = StringUtils.hasText(q)       ? q.trim()       : "";
        String prov     = sanitizer.normalizeGeo(provincia);
        String cant     = sanitizer.normalizeGeo(canton);
        int    offset   = page * size;

        List<CatalogoCardDTO> items = catalogoRepo
                .buscarConBuyBox(termino, prov, cant, size, offset)
                .stream()
                .map(CatalogoCardDTO::from)
                .toList();

        long total = catalogoRepo.contarBusqueda(termino);

        Map<String, Object> resp = new HashMap<>();
        resp.put("items",       items);
        resp.put("total",       total);
        resp.put("page",        page);
        resp.put("size",        size);
        resp.put("totalPages",  (int) Math.ceil((double) total / size));
        return resp;
    }

    // ─── Detalle de producto con Buy Box + lista de alternativas ─────────────

    @Transactional(readOnly = true)
    public ProductoMarketplaceDTO detalle(Long catalogoId, String provincia, String canton) {
        CatalogoMaestro cm = catalogoRepo.findById(Objects.requireNonNull(catalogoId))
                .filter(c -> Boolean.TRUE.equals(c.getActivo()))
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Catálogo no encontrado: " + catalogoId));

        String prov = sanitizer.normalizeGeo(provincia);
        String cant = sanitizer.normalizeGeo(canton);

        List<VendedorOfertaProjection> vendedores = catalogoRepo.listarVendedores(catalogoId, prov, cant);

        if (vendedores.isEmpty()) {
            ProductoMarketplaceDTO dto = ProductoMarketplaceDTO.fromCatalogo(cm);
            dto.vendedorPrincipal = null;
            dto.alternativas      = List.of();
            return dto;
        }

        // Primer resultado = Buy Box winner (query ya viene ordenada geo DESC, precio ASC)
        ProductoMarketplaceDTO dto = ProductoMarketplaceDTO.fromCatalogo(cm);
        dto.vendedorPrincipal = VendedorOfertaDTO.from(vendedores.get(0));
        dto.alternativas      = vendedores.subList(1, vendedores.size())
                                          .stream()
                                          .map(VendedorOfertaDTO::from)
                                          .toList();
        return dto;
    }

    // ─── Auto-agrupación al crear un producto (llamar desde ProductoService) ──
    //
    // Orden de precedencia:
    //   1. barcode  → match exacto (EAN/UPC universal)
    //   2. sku      → match exacto (SKU del fabricante)
    //   3. marca_id + modelo → match case-insensitive
    //   4. Sin match → crea una entrada nueva en el catálogo
    //
    @Transactional
    public CatalogoMaestro resolverCatalogoMaestro(Producto producto) {
        if (StringUtils.hasText(producto.getBarcode())) {
            Optional<CatalogoMaestro> found = catalogoRepo.findByCodigoBarras(producto.getBarcode());
            if (found.isPresent()) return found.get();
        }
        if (StringUtils.hasText(producto.getSku())) {
            Optional<CatalogoMaestro> found = catalogoRepo.findBySkuFabricante(producto.getSku());
            if (found.isPresent()) return found.get();
        }
        if (producto.getMarca() != null && StringUtils.hasText(producto.getModelo())) {
            Optional<CatalogoMaestro> found = catalogoRepo
                    .findByMarcaIdAndModeloIgnoreCase(producto.getMarca().getId(), producto.getModelo());
            if (found.isPresent()) return found.get();
        }
        return crearDesdeProducto(producto);
    }

    private CatalogoMaestro crearDesdeProducto(Producto p) {
        CatalogoMaestro cm = new CatalogoMaestro();
        cm.setNombre(p.getNombreProducto());
        cm.setDescripcionCorta(p.getDescripcionCorta());
        cm.setDescripcionLarga(p.getDescripcionLarga());
        cm.setImagenPrincipalUrl(p.getImagenPrincipalUrl());
        cm.setSkuFabricante(p.getSku());
        cm.setCodigoBarras(p.getBarcode());
        cm.setModelo(p.getModelo());
        cm.setMarca(p.getMarca());
        cm.setCategoria(p.getCategoria());
        cm.setTags(p.getTags());
        return catalogoRepo.save(cm);
    }

    // ─── CRUD de catálogo (admin) ─────────────────────────────────────────────

    @Transactional
    public CatalogoMaestro guardar(CatalogoMaestro body) {
        return catalogoRepo.save(body);
    }

    @Transactional
    public CatalogoMaestro actualizar(Long id, CatalogoMaestro body) {
        CatalogoMaestro cm = catalogoRepo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Catálogo no encontrado: " + id));
        if (StringUtils.hasText(body.getNombre()))          cm.setNombre(body.getNombre());
        if (body.getDescripcionCorta()    != null)          cm.setDescripcionCorta(body.getDescripcionCorta());
        if (body.getDescripcionLarga()    != null)          cm.setDescripcionLarga(body.getDescripcionLarga());
        if (body.getImagenPrincipalUrl()  != null)          cm.setImagenPrincipalUrl(body.getImagenPrincipalUrl());
        if (body.getImagenesExtra()       != null)          cm.setImagenesExtra(body.getImagenesExtra());
        if (body.getSkuFabricante()       != null)          cm.setSkuFabricante(body.getSkuFabricante());
        if (body.getCodigoBarras()        != null)          cm.setCodigoBarras(body.getCodigoBarras());
        if (body.getModelo()              != null)          cm.setModelo(body.getModelo());
        if (body.getMarca()               != null)          cm.setMarca(body.getMarca());
        if (body.getCategoria()           != null)          cm.setCategoria(body.getCategoria());
        if (body.getTags()                != null)          cm.setTags(body.getTags());
        if (body.getActivo()              != null)          cm.setActivo(body.getActivo());
        return catalogoRepo.save(cm);
    }
}
