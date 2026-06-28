package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.model.ProductoImagen;
import com.hotclick.repository.ProductoImagenRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductoImagenService {

    @Autowired private ProductoImagenRepository imagenRepository;
    @Autowired private ProductoRepository productoRepository;

    public List<ProductoImagen> listarPorProducto(Long productoId) {
        return imagenRepository.findByProductoIdOrderByPosicionAsc(productoId);
    }

    @Transactional
    public ProductoImagen agregar(Long productoId, String urlImagen, int posicion, boolean esPrincipal) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));

        ProductoImagen img = new ProductoImagen();
        img.setProducto(producto);
        img.setUrlImagen(urlImagen);
        img.setPosicion(posicion);
        img.setEsPrincipal(esPrincipal);

        if (esPrincipal) {
            producto.setImagenPrincipalUrl(urlImagen);
            productoRepository.save(producto);
        }

        return imagenRepository.save(img);
    }

    @Transactional
    public void eliminar(Long imagenId, Long productoId) {
        ProductoImagen img = imagenRepository.findById(imagenId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Imagen", imagenId));
        if (!img.getProducto().getId().equals(productoId)) {
            throw new IllegalArgumentException("La imagen no pertenece a este producto");
        }
        imagenRepository.delete(img);
    }

    /**
     * Reemplaza todas las imágenes de un producto con la lista recibida.
     * La primera imagen de la lista se marca como principal y sincroniza imagenPrincipalUrl.
     */
    @Transactional
    public List<ProductoImagen> sincronizar(Long productoId, List<String> urls) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));

        imagenRepository.deleteAll(imagenRepository.findByProductoIdOrderByPosicionAsc(productoId));

        for (int i = 0; i < Math.min(urls.size(), 10); i++) {
            ProductoImagen img = new ProductoImagen();
            img.setProducto(producto);
            img.setUrlImagen(urls.get(i));
            img.setPosicion(i);
            img.setEsPrincipal(i == 0);
            imagenRepository.save(img);
        }

        if (!urls.isEmpty()) {
            producto.setImagenPrincipalUrl(urls.get(0));
            productoRepository.save(producto);
        }

        return imagenRepository.findByProductoIdOrderByPosicionAsc(productoId);
    }
}
