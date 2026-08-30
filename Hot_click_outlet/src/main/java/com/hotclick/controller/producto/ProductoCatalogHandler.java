package com.hotclick.controller.producto;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Producto;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ProductoService;
import com.hotclick.service.StockService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.catalogo.ChatSearchTerms;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Endpoints de lectura del catálogo de productos.
 * Extraído bit-idéntico de ProductoController — no cambia comportamiento.
 */
@Component
public class ProductoCatalogHandler {

    private static final int MAX_PAGE_SIZE        = 100;
    private static final int MAX_PAGE_SIZE_PUBLIC =  50;

    @Autowired private ProductoService     productoService;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private CompanyScope        companyScope;
    @Autowired private StockService        stockService;
    @Autowired private ProductoAccessGuard productoAccessGuard;

    public ResponseEntity<ResponseDTO> listarProductos(int page, int size) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        var pageable  = PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE_PUBLIC));
        // Si hay empresaId en el JWT (contexto admin de ese negocio) → mostrar sus propios productos
        // Si es público (sin empresa, incluye ADMIN sin empresa) → catálogo filtrado (negocios aprobados y visibles)
        var productos = empresaId != null
            ? productoRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO, pageable)
            : productoService.listarTodosActivos(pageable);
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    public ResponseEntity<ResponseDTO> listarTodosAdmin(int page, int size) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        var pageable = PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE));
        var productos = empresaId != null
            ? productoRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO, pageable)
            : productoService.listarTodosActivos(pageable);
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    /** POS: categorías con productos de este negocio, no las del marketplace entero. */
    public ResponseEntity<ResponseDTO> categoriasPOS() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida en el contexto"));
        }
        var cats = categoriaRepository.findConProductosDeEmpresa(empresaId, Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("OK", cats));
    }

    /** POS: productos por categoría dentro de la empresa. */
    public ResponseEntity<ResponseDTO> porCategoriaPOS(Long catId) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida en el contexto"));
        }
        var productos = productoRepository.findByCategoriaIdAndEmpresaId(catId, empresaId);
        return ResponseEntity.ok(ResponseDTO.success("OK", productos));
    }

    /** Búsqueda POS: por nombre, SKU o barcode dentro de la empresa. */
    public ResponseEntity<ResponseDTO> buscar(String q) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida en el contexto"));
        }
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(ResponseDTO.success("OK", List.of()));
        }
        var pageable = PageRequest.of(0, 30);
        var resultados = productoRepository.buscarPorTextoOCodigoEnEmpresa(
            ChatSearchTerms.quitarComodinesLike(q.trim()), empresaId, pageable);
        return ResponseEntity.ok(ResponseDTO.success("OK", resultados));
    }

    /** Kardex: historial de movimientos de stock de un producto. */
    public ResponseEntity<ResponseDTO> kardex(Long id) {
        try {
            productoAccessGuard.assertCanAccessProducto(id);
            var movimientos = stockService.historialPorProducto(id);
            return ResponseEntity.ok(ResponseDTO.success("OK", movimientos));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> listarDestacados() {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic());
        return ResponseEntity.ok().headers(headers)
                .body(ResponseDTO.success("Destacados obtenidos", productoService.listarDestacados()));
    }

    public ResponseEntity<ResponseDTO> listarCarrusel() {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic());
        return ResponseEntity.ok().headers(headers)
                .body(ResponseDTO.success("Carrusel obtenido", productoService.listarCarrusel()));
    }

    public ResponseEntity<ResponseDTO> recomendaciones(Long id, int limit) {
        return ResponseEntity.ok(ResponseDTO.success("Recomendaciones obtenidas",
                productoService.getRecomendaciones(id, limit)));
    }

    public ResponseEntity<ResponseDTO> listarPorMarca(Long marcaId, int page, int size) {
        var productos = productoService.listarPorMarca(marcaId, PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE_PUBLIC)));
        return ResponseEntity.ok(ResponseDTO.success("Productos por marca", productos));
    }

    public ResponseEntity<ResponseDTO> obtenerProducto(Long id) {
        try {
            Producto producto = productoService.buscarPorId(id);
            productoAccessGuard.assertCanAccessProductoDetalle(producto);
            return ResponseEntity.ok(ResponseDTO.success("Producto encontrado", producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Otros colores/variantes de la misma pieza — para el selector de swatches en el detalle. */
    public ResponseEntity<ResponseDTO> obtenerVariantes(Long id) {
        Producto base = productoService.buscarPorId(id);
        if (base.getGrupoVarianteId() == null) {
            return ResponseEntity.ok(ResponseDTO.success("Sin variantes", java.util.List.of()));
        }
        var hermanos = productoRepository.findByGrupoVarianteIdAndEstadoAndVisibleCatalogo(
                base.getGrupoVarianteId(), Constants.ESTADO_ACTIVO, true)
            .stream()
            .map(p -> java.util.Map.of(
                "id", p.getId(),
                "nombreProducto", p.getNombreProducto(),
                "colorVariante", p.getColorVariante() != null ? p.getColorVariante() : "",
                "talla", p.getTalla() != null ? p.getTalla() : "",
                "imagenPrincipalUrl", p.getImagenPrincipalUrl() != null ? p.getImagenPrincipalUrl() : "",
                "precioVenta", p.getPrecioVenta(),
                "stock", p.getStock()
            ))
            .toList();
        return ResponseEntity.ok(ResponseDTO.success("Variantes", hermanos));
    }

    /** Productos en oferta — público */
    public ResponseEntity<ResponseDTO> enOferta() {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            List<Producto> lista = empresaId != null
                ? productoRepository.findByEnOfertaTrueAndEmpresaIdAndVisibleCatalogoTrue(empresaId)
                : productoRepository.findByEnOfertaTrueAndVisibleCatalogoTrue();
            return ResponseEntity.ok(ResponseDTO.success("Ofertas", lista));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
