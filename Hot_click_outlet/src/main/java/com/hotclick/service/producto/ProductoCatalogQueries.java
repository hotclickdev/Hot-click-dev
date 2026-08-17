package com.hotclick.service.producto;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class ProductoCatalogQueries {

    /** La tienda principal no lleva badge de emprendimiento en el catálogo público. */
    @Value("${EMPRESA_PRINCIPAL_ID:1}")
    private Long empresaPrincipalId;

    private final ProductoRepository productoRepository;

    public ProductoCatalogQueries(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    @Cacheable(value = "productos-publicos", key = "'rec-' + #id + '-' + #limit")
    @Transactional(readOnly = true)
    public List<Producto> getRecomendaciones(Long id, int limit) {
        Producto base = productoRepository.findById(id).orElse(null);
        if (base == null) return List.of();

        List<Producto> result = new ArrayList<>();

        // Primero intentar misma categoría
        if (base.getCategoria() != null) {
            List<Producto> sameCategory = productoRepository
                .findByCategoriaIdAndEstadoAndStockActualGreaterThan(
                    base.getCategoria().getId(), Constants.ESTADO_ACTIVO, 0, PageRequest.of(0, limit + 1))
                .getContent().stream()
                .filter(p -> !p.getId().equals(id))
                .limit(limit)
                .toList();
            result.addAll(sameCategory);
        }

        // Rellenar con productos de cualquier categoría si faltan
        if (result.size() < limit) {
            int needed = limit - result.size() + 1;
            Set<Long> exclude = new HashSet<>();
            exclude.add(id);
            result.forEach(p -> exclude.add(p.getId()));
            List<Producto> general = productoRepository
                .findByEstadoAndStockActualGreaterThan(Constants.ESTADO_ACTIVO, 0, PageRequest.of(0, needed * 3))
                .getContent().stream()
                .filter(p -> !exclude.contains(p.getId()))
                .limit(needed)
                .toList();
            result.addAll(general);
        }

        return result.stream().limit(limit).toList();
    }

    @Cacheable(value = "productos-publicos", key = "'marca-' + #marcaId + '-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    @Transactional(readOnly = true)
    public Page<Producto> listarPorMarca(Long marcaId, Pageable pageable) {
        // Solo negocios aprobados y visibles
        return productoRepository.findByMarcaPublico(marcaId, Constants.ESTADO_ACTIVO, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Producto> listarProductosDisponibles(Pageable pageable) {
        return productoRepository.findByEstado(Constants.ESTADO_ACTIVO, pageable);
    }

    @Cacheable(value = "productos-publicos", key = "'todos-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    @Transactional(readOnly = true)
    public Page<Producto> listarTodosActivos(Pageable pageable) {
        // Solo negocios aprobados visibles en catálogo público
        var page = productoRepository.findByEstadoAndEmpresaAprobada(Constants.ESTADO_ACTIVO, pageable);
        page.forEach(this::poblarBadgeEmpresa);
        return page;
    }

    @Cacheable(value = "productos-publicos", key = "'cat-' + #categoriaId + '-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    @Transactional(readOnly = true)
    public Page<Producto> listarPorCategoria(Long categoriaId, Pageable pageable) {
        return productoRepository.findByCategoriaPublico(categoriaId, Constants.ESTADO_ACTIVO, pageable);
    }

    @Cacheable(value = "productos-publicos", key = "'destacados'")
    @Transactional(readOnly = true)
    public List<Producto> listarDestacados() {
        return productoRepository.findDestacadosPublicos(Constants.ESTADO_ACTIVO);
    }

    @Cacheable(value = "productos-publicos", key = "'carrusel'")
    @Transactional(readOnly = true)
    public List<Producto> listarCarrusel() {
        return productoRepository.findCarruselPublico(Constants.ESTADO_ACTIVO);
    }

    @Transactional(readOnly = true)
    public List<Producto> listarArticulosUnicos() {
        return productoRepository.findByEsUnicoTrueAndVendidoFalseAndEstado(Constants.ESTADO_ACTIVO);
    }

    @Transactional(readOnly = true)
    public List<Producto> productosConStockBajo() {
        return productoRepository.findProductosConStockBajo();
    }

    /**
     * Copia nombre y slug de la empresa a campos transient del producto,
     * dentro de la transacción (open-in-view=false impide hacerlo al serializar).
     * Los productos de la tienda principal (empresa null) no llevan badge.
     */
    private void poblarBadgeEmpresa(Producto p) {
        var e = p.getEmpresa();
        if (e == null || !Boolean.TRUE.equals(e.getVisibilidadPublica()) || e.getSlug() == null) return;
        if (e.getId().equals(empresaPrincipalId)) return;
        var nombre = e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa();
        p.setEmpresaNombre(nombre);
        p.setEmpresaSlug(e.getSlug());
    }
}
