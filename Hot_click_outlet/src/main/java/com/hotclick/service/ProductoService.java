package com.hotclick.service;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Transactional
    public Producto crearProducto(Producto producto) {
        producto.setEstado(Constants.ESTADO_ACTIVO);
        return productoRepository.save(producto);
    }

    @Transactional
    public Producto actualizarProducto(Long id, Producto datos) {
        Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        producto.setNombreProducto(datos.getNombreProducto());
        producto.setDescripcionCorta(datos.getDescripcionCorta());
        producto.setDescripcionLarga(datos.getDescripcionLarga());
        producto.setPrecioCompra(datos.getPrecioCompra());
        producto.setPrecioVenta(datos.getPrecioVenta());
        producto.setStockActual(datos.getStockActual());
        producto.setStockMinimo(datos.getStockMinimo());
        producto.setStockMaximo(datos.getStockMaximo());
        producto.setLinkAmazon(datos.getLinkAmazon());
        producto.setEsUnico(datos.getEsUnico());
        producto.setVendido(datos.getVendido());
        producto.setDestacado(datos.getDestacado());
        producto.setVisibleCatalogo(datos.getVisibleCatalogo());
        return productoRepository.save(producto);
    }

    @Transactional
    public void eliminarProducto(Long id) {
        Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        producto.setEstado(Constants.ESTADO_INACTIVO);
        productoRepository.save(producto);
    }

    @Transactional
    public Producto marcarComoVendido(Long id) {
        Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        producto.setVendido(true);
        producto.setStockActual(0);
        return productoRepository.save(producto);
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
