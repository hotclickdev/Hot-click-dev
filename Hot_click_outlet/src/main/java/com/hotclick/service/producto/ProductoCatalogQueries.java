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
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
    /** VIS-3c: mismo filtro que el catálogo público: visible en catálogo y negocio ACTIVO + visible. */
    static boolean esPublico(Producto p) {
        if (p == null || !Boolean.TRUE.equals(p.getVisibleCatalogo())) return false;
        var e = p.getEmpresa() != null ? p.getEmpresa() : (p.getBodega() != null ? p.getBodega().getEmpresa() : null);
        return e != null && "ACTIVO".equals(String.valueOf(e.getEstadoEmpresa()))
            && !Boolean.FALSE.equals(e.getVisibilidadPublica());
    }

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
                .filter(ProductoCatalogQueries::esPublico)
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
                .filter(ProductoCatalogQueries::esPublico)
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
    /**
     * Tienda visible de cada producto, con la misma regla que el badge del catálogo público.
     * Los productos de la tienda principal o de negocios no visibles no aparecen en el mapa.
     */
    @Transactional(readOnly = true)
    public Map<Long, String> tiendasVisibles(Collection<Long> ids) {
        Map<Long, String> tiendas = new HashMap<>();
        if (ids == null || ids.isEmpty()) return tiendas;
        for (Producto p : productoRepository.findAllById(ids)) {
            poblarBadgeEmpresa(p);
            if (p.getEmpresaNombre() != null) tiendas.put(p.getId(), p.getEmpresaNombre());
        }
        return tiendas;
    }

    /**
     * Ficha pública: nombre de la tienda (y enlace si es pública) en el producto que se devuelve, leyendo el negocio
     * dentro de una transacción (el producto de la ficha puede venir sin la relación cargada). Best-effort.
     */
    @Transactional(readOnly = true)
    public void poblarVendedorFicha(Producto destino) {
        if (destino == null || destino.getId() == null) return;
        productoRepository.findById(destino.getId()).ifPresent(cargado -> {
            var e = cargado.getEmpresa();
            if (e == null || e.getId().equals(empresaPrincipalId)) return;
            // La ficha ya pasó el guard de acceso: el vendedor es siempre el nombre de la tienda (nunca la bodega);
            // el enlace a la tienda, solo si es pública y tiene slug.
            destino.setEmpresaNombre(com.hotclick.utils.EmpresaNombre.mostrar(e, null));
            destino.setEmpresaSlug(Boolean.TRUE.equals(e.getVisibilidadPublica()) ? e.getSlug() : null);
        });
    }

    public void poblarBadgeEmpresa(Producto p) {
        var e = p.getEmpresa();
        if (e == null || !Boolean.TRUE.equals(e.getVisibilidadPublica()) || e.getSlug() == null) return;
        if (e.getId().equals(empresaPrincipalId)) return;
        p.setEmpresaNombre(com.hotclick.utils.EmpresaNombre.mostrar(e, null));
        p.setEmpresaSlug(e.getSlug());
    }
}
