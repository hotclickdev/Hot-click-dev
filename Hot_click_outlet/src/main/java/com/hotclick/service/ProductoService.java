package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.rag.event.ProductoGuardadoEvent;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class ProductoService {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired private CacheManager cacheManager;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private ApplicationEventPublisher eventPublisher;

    @SuppressWarnings("null")
    private void evictDashboard(Long empresaId) {
        Cache c = cacheManager.getCache("dashboard-metricas");
        if (c == null) return;
        if (empresaId != null) {
            c.evict(empresaId.toString());
        } else {
            c.evict("global");
        }
    }

    @SuppressWarnings("null")
    private void evictProductosPublicos() {
        Cache c = cacheManager.getCache("productos-publicos");
        if (c != null) c.clear();
    }

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo) {
        return crearProducto(dto, adminCorreo, null);
    }

    @CacheEvict(value = "dashboard-metricas",
        key = "#empresa != null ? #empresa.id.toString() : 'global'")
    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo, Empresa empresa) {
        evictProductosPublicos();
        if (dto.getCategoriaId() == null)
            throw new IllegalArgumentException("Debe seleccionar una categoría");
        if (dto.getBodegaId() == null)
            throw new IllegalArgumentException("Debe seleccionar una bodega");

        Producto p = new Producto();
        mapDtoToProducto(dto, p);
        p.setEstado(Constants.ESTADO_ACTIVO);
        if (p.getSku() == null) {
            p.setSku("HC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        p.setCategoria(categoriaRepository.findById(dto.getCategoriaId())
            .orElseThrow(() -> new RuntimeException("Categoría no encontrada")));
        p.setBodega(bodegaRepository.findById(dto.getBodegaId())
            .orElseThrow(() -> new RuntimeException("Bodega no encontrada")));
        p.setAdminCliente(usuarioRepository.findByCorreo(adminCorreo)
            .orElseThrow(() -> new RuntimeException("Admin no encontrado")));
        p.setEmpresa(empresa);
        Producto saved = productoRepository.save(p);
        eventPublisher.publishEvent(new ProductoGuardadoEvent(
            this,
            saved.getId(),
            empresa != null ? empresa.getId() : null,
            saved.getNombreProducto(),
            saved.getDescripcionCorta(),
            saved.getMarcaTexto(),
            saved.getSku(),
            saved.getTags(),
            saved.getEspecificaciones()
        ));
        return saved;
    }

    public Producto actualizarProducto(Long id, ProductoRequestDTO dto, String adminCorreo) {
        // Leer empresaId una sola vez antes del loop: evita LazyInitializationException
        // al acceder a p.getEmpresa() fuera de transacción (open-in-view=false, empresa=LAZY).
        Long empresaId = productoRepository.findEmpresaIdById(id).orElse(null);
        int intentos = 0;
        while (true) {
            try {
                Producto p = productoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                mapDtoToProducto(dto, p);
                if (dto.getCategoriaId() != null) {
                    p.setCategoria(categoriaRepository.findById(dto.getCategoriaId())
                        .orElseThrow(() -> new RuntimeException("Categoría no encontrada")));
                }
                if (dto.getBodegaId() != null) {
                    p.setBodega(bodegaRepository.findById(dto.getBodegaId())
                        .orElseThrow(() -> new RuntimeException("Bodega no encontrada")));
                }
                Producto saved = productoRepository.save(p);
                evictDashboard(empresaId);
                evictProductosPublicos();
                eventPublisher.publishEvent(new ProductoGuardadoEvent(
                    this,
                    saved.getId(),
                    empresaId,
                    saved.getNombreProducto(),
                    saved.getDescripcionCorta(),
                    saved.getMarcaTexto(),
                    saved.getSku(),
                    saved.getTags(),
                    saved.getEspecificaciones()
                ));
                return saved;
            } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
                if (++intentos >= 3) {
                    throw new RuntimeException("Conflicto de concurrencia al actualizar producto. Intentá de nuevo.");
                }
                try { Thread.sleep(50L * intentos); } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ie);
                }
            }
        }
    }

    private void mapDtoToProducto(ProductoRequestDTO dto, Producto p) {
        if (dto.getNombreProducto()     != null) p.setNombreProducto(sanitizer.cleanWithLimit(dto.getNombreProducto(), 200));
        if (dto.getDescripcionCorta()   != null) p.setDescripcionCorta(sanitizer.cleanWithLimit(dto.getDescripcionCorta(), 255));
        if (dto.getTituloProducto()     != null) p.setTituloProducto(sanitizer.cleanWithLimit(dto.getTituloProducto(), 255));
        if (dto.getMarcaTexto()         != null) p.setMarcaTexto(sanitizer.cleanWithLimit(dto.getMarcaTexto(), 100));
        if (dto.getLinkAmazon()         != null) p.setLinkAmazon(sanitizer.cleanWithLimit(dto.getLinkAmazon(), 500));
        if (dto.getImagenPrincipalUrl() != null) p.setImagenPrincipalUrl(sanitizer.cleanWithLimit(dto.getImagenPrincipalUrl(), 500));
        if (dto.getCondicion()          != null) p.setCondicion(dto.getCondicion());
        if (dto.getPrecioCompra()       != null) p.setPrecioCompra(dto.getPrecioCompra());
        if (dto.getPrecioVenta()        != null) p.setPrecioVenta(dto.getPrecioVenta());
        if (dto.getStockActual()        != null) p.setStockActual(dto.getStockActual());
        if (dto.getStockMinimo()        != null) p.setStockMinimo(dto.getStockMinimo());
        if (dto.getVisibleCatalogo()    != null) p.setVisibleCatalogo(dto.getVisibleCatalogo());
        if (dto.getDestacado()          != null) p.setDestacado(dto.getDestacado());
        // Rich text: permite negrita/lista pero bloquea scripts
        if (dto.getEspecificaciones()   != null) p.setEspecificaciones(sanitizer.cleanRichText(dto.getEspecificaciones()));
        if (dto.getComoUsar()           != null) p.setComoUsar(sanitizer.cleanRichText(dto.getComoUsar()));
        if (dto.getDescripcionLarga()   != null) p.setDescripcionLarga(sanitizer.cleanRichText(dto.getDescripcionLarga()));
        if (dto.getMetaTitle()          != null) p.setMetaTitle(sanitizer.cleanWithLimit(dto.getMetaTitle(), 70));
        if (dto.getMetaDescription()    != null) p.setMetaDescription(sanitizer.cleanWithLimit(dto.getMetaDescription(), 160));
        if (dto.getMetaKeywords()       != null) p.setMetaKeywords(sanitizer.cleanWithLimit(dto.getMetaKeywords(), 255));
        if (dto.getMetaTitleEn()        != null) p.setMetaTitleEn(sanitizer.cleanWithLimit(dto.getMetaTitleEn(), 70));
        if (dto.getMetaTitlePt()        != null) p.setMetaTitlePt(sanitizer.cleanWithLimit(dto.getMetaTitlePt(), 70));
        if (dto.getMetaTitleFr()        != null) p.setMetaTitleFr(sanitizer.cleanWithLimit(dto.getMetaTitleFr(), 70));
        if (dto.getMetaDescriptionEn()  != null) p.setMetaDescriptionEn(sanitizer.cleanWithLimit(dto.getMetaDescriptionEn(), 160));
        if (dto.getMetaDescriptionPt()  != null) p.setMetaDescriptionPt(sanitizer.cleanWithLimit(dto.getMetaDescriptionPt(), 160));
        if (dto.getMetaDescriptionFr()  != null) p.setMetaDescriptionFr(sanitizer.cleanWithLimit(dto.getMetaDescriptionFr(), 160));
        if (dto.getVideoUrl()           != null) p.setVideoUrl(sanitizer.cleanWithLimit(dto.getVideoUrl(), 500));
        if (dto.getTalla()              != null) p.setTalla(sanitizer.cleanWithLimit(dto.getTalla(), 20));
        if (dto.getTags()               != null) p.setTags(sanitizer.cleanWithLimit(dto.getTags().toLowerCase(), 500));
        Long mid = dto.getMarcaId();
        if (mid != null) {
            p.setMarca(marcaRepository.findById(mid)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada")));
        }
    }

    @Cacheable(value = "productos-publicos", key = "'rec-' + #id + '-' + #limit")
    @Transactional(readOnly = true)
    public List<Producto> getRecomendaciones(Long id, int limit) {
        Producto base = productoRepository.findById(id).orElse(null);
        if (base == null) return List.of();

        List<Producto> result = new java.util.ArrayList<>();

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
            java.util.Set<Long> exclude = new java.util.HashSet<>();
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


    @Transactional
    public void eliminarProducto(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setEstado(Constants.ESTADO_INACTIVO);
        productoRepository.save(p);
        evictProductosPublicos();
    }

    @Transactional
    public Producto toggleDestacado(Long id, Boolean valor) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setDestacado(valor);
        Producto saved = productoRepository.save(p);
        evictProductosPublicos();
        return saved;
    }

    @Transactional
    public Producto marcarComoVendido(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setVendido(true);
        p.setStockActual(0);
        Producto saved = productoRepository.save(p);
        evictProductosPublicos();
        return saved;
    }

    @Transactional(readOnly = true)
    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    @Transactional(readOnly = true)
    public Page<Producto> listarProductosDisponibles(Pageable pageable) {
        return productoRepository.findByEstado(Constants.ESTADO_ACTIVO, pageable);
    }

    @Cacheable(value = "productos-publicos", key = "'todos-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    @Transactional(readOnly = true)
    public Page<Producto> listarTodosActivos(Pageable pageable) {
        // Solo negocios aprobados visibles en catálogo público
        return productoRepository.findByEstadoAndEmpresaAprobada(Constants.ESTADO_ACTIVO, pageable);
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

    @Transactional
    public Producto toggleCarrusel(Long id, Boolean valor, Integer orden) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setEnCarrusel(valor);
        if (orden != null) p.setOrdenCarrusel(orden);
        Producto saved = productoRepository.save(p);
        evictProductosPublicos();
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Producto> listarArticulosUnicos() {
        return productoRepository.findByEsUnicoTrueAndVendidoFalseAndEstado(Constants.ESTADO_ACTIVO);
    }

    @Transactional(readOnly = true)
    public List<Producto> productosConStockBajo() {
        return productoRepository.findProductosConStockBajo();
    }
}
