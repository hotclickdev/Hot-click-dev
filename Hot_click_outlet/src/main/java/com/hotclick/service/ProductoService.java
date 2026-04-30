package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ProductoService {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo) {
        Producto p = new Producto();
        mapDtoToProducto(dto, p);
        p.setEstado(Constants.ESTADO_ACTIVO);
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
        if (dto.getNombreProducto()   != null) p.setNombreProducto(dto.getNombreProducto());
        if (dto.getDescripcionCorta() != null) p.setDescripcionCorta(dto.getDescripcionCorta());
        if (dto.getPrecioCompra()     != null) p.setPrecioCompra(dto.getPrecioCompra());
        if (dto.getPrecioVenta()      != null) p.setPrecioVenta(dto.getPrecioVenta());
        if (dto.getStockActual()      != null) p.setStockActual(dto.getStockActual());
        if (dto.getStockMinimo()      != null) p.setStockMinimo(dto.getStockMinimo());
        if (dto.getLinkAmazon()       != null) p.setLinkAmazon(dto.getLinkAmazon());
        if (dto.getVisibleCatalogo()  != null) p.setVisibleCatalogo(dto.getVisibleCatalogo());
        if (dto.getDestacado()        != null) p.setDestacado(dto.getDestacado());
    }

    @Transactional
    public void eliminarProducto(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        p.setEstado(Constants.ESTADO_INACTIVO);
        productoRepository.save(p);
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

    public Page<Producto> listarPorCategoria(Long categoriaId, Pageable pageable) {
        return productoRepository.findByCategoriaIdAndEstado(categoriaId, Constants.ESTADO_ACTIVO, pageable);
    }

    public List<Producto> listarDestacados() {
        return productoRepository.findByDestacadoTrueAndEstado(Constants.ESTADO_ACTIVO);
    }

    public List<Producto> listarArticulosUnicos() {
        return productoRepository.findByEsUnicoTrueAndVendidoFalseAndEstado(Constants.ESTADO_ACTIVO);
    }

    public List<Producto> productosConStockBajo() {
        return productoRepository.findProductosConStockBajo();
    }
}
