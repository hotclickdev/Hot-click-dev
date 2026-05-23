package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo) {
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
        return productoRepository.save(p);
    }

    @Transactional
    public Producto actualizarProducto(Long id, ProductoRequestDTO dto, String adminCorreo) {
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
        return productoRepository.save(p);
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
        Long mid = dto.getMarcaId();
        if (mid != null) {
            p.setMarca(marcaRepository.findById(mid)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada")));
        }
    }

    public List<Producto> getRecomendaciones(Long id, int limit) {
        Producto base = productoRepository.findById(id).orElse(null);
        if (base == null || base.getCategoria() == null) return List.of();
        return productoRepository
            .findByCategoriaIdAndEstadoAndStockActualGreaterThan(
                base.getCategoria().getId(), Constants.ESTADO_ACTIVO, 0, PageRequest.of(0, limit + 1))
            .getContent().stream()
            .filter(p -> !p.getId().equals(id))
            .limit(limit)
            .toList();
    }

    public Page<Producto> listarPorMarca(Long marcaId, Pageable pageable) {
        return productoRepository.findByMarcaIdAndEstadoAndStockActualGreaterThan(marcaId, Constants.ESTADO_ACTIVO, 0, pageable);
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
        return productoRepository.findByEstadoAndStockActualGreaterThan(Constants.ESTADO_ACTIVO, 0, pageable);
    }

    public Page<Producto> listarTodosActivos(Pageable pageable) {
        return productoRepository.findByEstado(Constants.ESTADO_ACTIVO, pageable);
    }

    public Page<Producto> listarPorCategoria(Long categoriaId, Pageable pageable) {
        return productoRepository.findByCategoriaIdAndEstado(categoriaId, Constants.ESTADO_ACTIVO, pageable);
    }

    public List<Producto> listarDestacados() {
        return productoRepository.findByDestacadoTrueAndEstado(Constants.ESTADO_ACTIVO);
    }

    public List<Producto> listarCarrusel() {
        return productoRepository.findByEnCarruselTrueAndEstadoOrderByOrdenCarruselAsc(Constants.ESTADO_ACTIVO);
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
