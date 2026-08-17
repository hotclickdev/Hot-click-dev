package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.producto.ProductoCatalogQueries;
import com.hotclick.service.producto.ProductoCacheEvictor;
import com.hotclick.service.producto.ProductoUpdater;
import com.hotclick.service.producto.ProductoWriteOperations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ProductoService {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private ProductoCatalogQueries catalogQueries;
    @Autowired private ProductoCacheEvictor cacheEvictor;
    @Autowired private ProductoWriteOperations writeOperations;
    @Autowired private ProductoUpdater productoUpdater;

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo) {
        return crearProducto(dto, adminCorreo, null);
    }

    @CacheEvict(value = "dashboard-metricas",
        key = "#empresa != null ? #empresa.id.toString() : 'global'")
    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto, String adminCorreo, Empresa empresa) {
        return writeOperations.crearProducto(this, dto, adminCorreo, empresa);
    }

    public Producto actualizarProducto(Long id, ProductoRequestDTO dto, String adminCorreo) {
        return productoUpdater.actualizarProducto(this, id, dto, adminCorreo);
    }

    public void evictProductosPublicos() {
        cacheEvictor.evictProductosPublicos();
    }

    public void eliminarProducto(Long id) {
        writeOperations.eliminarProducto(id);
    }

    public Producto toggleDestacado(Long id, Boolean valor) {
        return writeOperations.toggleDestacado(id, valor);
    }

    public Producto aplicarOferta(Long id, boolean enOferta, Integer porcentajeDescuento, Integer precioOferta) {
        return writeOperations.aplicarOferta(id, enOferta, porcentajeDescuento, precioOferta);
    }

    public Producto marcarComoVendido(Long id) {
        return writeOperations.marcarComoVendido(id);
    }

    @Transactional(readOnly = true)
    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
    }

    public Producto toggleCarrusel(Long id, Boolean valor, Integer orden) {
        return writeOperations.toggleCarrusel(id, valor, orden);
    }

    public List<Producto> getRecomendaciones(Long id, int limit) {
        return catalogQueries.getRecomendaciones(id, limit);
    }

    public Page<Producto> listarPorMarca(Long marcaId, Pageable pageable) {
        return catalogQueries.listarPorMarca(marcaId, pageable);
    }

    public Page<Producto> listarProductosDisponibles(Pageable pageable) {
        return catalogQueries.listarProductosDisponibles(pageable);
    }

    public Page<Producto> listarTodosActivos(Pageable pageable) {
        return catalogQueries.listarTodosActivos(pageable);
    }

    public Page<Producto> listarPorCategoria(Long categoriaId, Pageable pageable) {
        return catalogQueries.listarPorCategoria(categoriaId, pageable);
    }

    public List<Producto> listarDestacados() {
        return catalogQueries.listarDestacados();
    }

    public List<Producto> listarCarrusel() {
        return catalogQueries.listarCarrusel();
    }

    public List<Producto> listarArticulosUnicos() {
        return catalogQueries.listarArticulosUnicos();
    }

    public List<Producto> productosConStockBajo() {
        return catalogQueries.productosConStockBajo();
    }
}
