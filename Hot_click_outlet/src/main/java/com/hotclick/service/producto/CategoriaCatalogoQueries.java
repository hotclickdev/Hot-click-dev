package com.hotclick.service.producto;

import com.hotclick.dto.CategoriaConProductosDTO;
import com.hotclick.repository.ProductoRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class CategoriaCatalogoQueries {

    private final ProductoRepository productoRepository;

    public CategoriaCatalogoQueries(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    @Cacheable(value = "productos-publicos", key = "'categorias-con-productos'")
    @Transactional(readOnly = true)
    public List<CategoriaConProductosDTO> categoriasConProductos() {
        return productoRepository.contarCatalogoPublicoPorCategoria().stream()
            .map(CategoriaConProductosDTO::desdeFila)
            .toList();
    }
}
