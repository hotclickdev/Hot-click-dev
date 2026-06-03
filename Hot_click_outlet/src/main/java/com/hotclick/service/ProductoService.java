package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
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

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo) {
        return crearProducto(dto, adminCorreo, null);
    }

    @CacheEvict(value = "dashboard-metricas",
        key = "#empresa != null ? #empresa.id.toString() : 'global'")
    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo, Empresa empresa) {
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
        return productoRepository.save(p);
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
        if (dto.getNombreProducto()     != null) p.setNombreProducto(trunc(dto.getNombreProducto(), 200));
        if (dto.getDescripcionCorta()   != null) p.setDescripcionCorta(trunc(dto.getDescripcionCorta(), 255));
        if (dto.getTituloProducto()     != null) p.setTituloProducto(trunc(dto.getTituloProducto(), 255));
        if (dto.getMarcaTexto()         != null) p.setMarcaTexto(trunc(dto.getMarcaTexto(), 100));
        if (dto.getLinkAmazon()         != null) p.setLinkAmazon(trunc(dto.getLinkAmazon(), 500));
        if (dto.getImagenPrincipalUrl() != null) p.setImagenPrincipalUrl(trunc(dto.getImagenPrincipalUrl(), 500));
        if (dto.getCondicion()          != null) p.setCondicion(dto.getCondicion());
        if (dto.getPrecioCompra()       != null) p.setPrecioCompra(dto.getPrecioCompra());
        if (dto.getPrecioVenta()        != null) p.setPrecioVenta(dto.getPrecioVenta());
        if (dto.getStockActual()        != null) p.setStockActual(dto.getStockActual());
        if (dto.getStockMinimo()        != null) p.setStockMinimo(dto.getStockMinimo());
        if (dto.getVisibleCatalogo()    != null) p.setVisibleCatalogo(dto.getVisibleCatalogo());
        if (dto.getDestacado()          != null) p.setDestacado(dto.getDestacado());
        if (dto.getEspecificaciones()   != null) p.setEspecificaciones(trunc(dto.getEspecificaciones(), 5000));
        if (dto.getComoUsar()           != null) p.setComoUsar(trunc(dto.getComoUsar(), 5000));
        if (dto.getDescripcionLarga()   != null) p.setDescripcionLarga(trunc(dto.getDescripcionLarga(), 5000));
        if (dto.getMetaTitle()          != null) p.setMetaTitle(trunc(dto.getMetaTitle(), 70));
        if (dto.getMetaDescription()    != null) p.setMetaDescription(trunc(dto.getMetaDescription(), 160));
        if (dto.getMetaKeywords()       != null) p.setMetaKeywords(trunc(dto.getMetaKeywords(), 255));
        if (dto.getMetaTitleEn()        != null) p.setMetaTitleEn(trunc(dto.getMetaTitleEn(), 70));
        if (dto.getMetaTitlePt()        != null) p.setMetaTitlePt(trunc(dto.getMetaTitlePt(), 70));
        if (dto.getMetaTitleFr()        != null) p.setMetaTitleFr(trunc(dto.getMetaTitleFr(), 70));
        if (dto.getMetaDescriptionEn()  != null) p.setMetaDescriptionEn(trunc(dto.getMetaDescriptionEn(), 160));
        if (dto.getMetaDescriptionPt()  != null) p.setMetaDescriptionPt(trunc(dto.getMetaDescriptionPt(), 160));
        if (dto.getMetaDescriptionFr()  != null) p.setMetaDescriptionFr(trunc(dto.getMetaDescriptionFr(), 160));
        if (dto.getVideoUrl()           != null) p.setVideoUrl(trunc(dto.getVideoUrl(), 500));
        if (dto.getTalla()              != null) p.setTalla(trunc(dto.getTalla(), 20));
        if (dto.getTags()               != null) p.setTags(dto.getTags().toLowerCase().trim());
        Long mid = dto.getMarcaId();
        if (mid != null) {
            p.setMarca(marcaRepository.findById(mid)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada")));
        }
    }

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

    public Page<Producto> listarPorMarca(Long marcaId, Pageable pageable) {
        // Solo negocios aprobados y visibles
        return productoRepository.findByMarcaPublico(marcaId, Constants.ESTADO_ACTIVO, pageable);
    }

    private static String trunc(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }

    @Transactional
    public void eliminarProducto(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setEstado(Constants.ESTADO_INACTIVO);
        productoRepository.save(p);
    }

    @Transactional
    public Producto toggleDestacado(Long id, Boolean valor) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setDestacado(valor);
        return productoRepository.save(p);
    }

    @Transactional
    public Producto marcarComoVendido(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setVendido(true);
        p.setStockActual(0);
        return productoRepository.save(p);
    }

    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    public Page<Producto> listarProductosDisponibles(Pageable pageable) {
        return productoRepository.findByEstado(Constants.ESTADO_ACTIVO, pageable);
    }

    public Page<Producto> listarTodosActivos(Pageable pageable) {
        // Solo negocios aprobados visibles en catálogo público
        return productoRepository.findByEstadoAndEmpresaAprobada(Constants.ESTADO_ACTIVO, pageable);
    }

    public Page<Producto> listarPorCategoria(Long categoriaId, Pageable pageable) {
        return productoRepository.findByCategoriaPublico(categoriaId, Constants.ESTADO_ACTIVO, pageable);
    }

    public List<Producto> listarDestacados() {
        return productoRepository.findDestacadosPublicos(Constants.ESTADO_ACTIVO);
    }

    public List<Producto> listarCarrusel() {
        return productoRepository.findCarruselPublico(Constants.ESTADO_ACTIVO);
    }

    @Transactional
    public Producto toggleCarrusel(Long id, Boolean valor, Integer orden) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setEnCarrusel(valor);
        if (orden != null) p.setOrdenCarrusel(orden);
        return productoRepository.save(p);
    }

    public List<Producto> listarArticulosUnicos() {
        return productoRepository.findByEsUnicoTrueAndVendidoFalseAndEstado(Constants.ESTADO_ACTIVO);
    }

    public List<Producto> productosConStockBajo() {
        return productoRepository.findProductosConStockBajo();
    }
}
