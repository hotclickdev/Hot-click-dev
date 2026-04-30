package com.hotclick.repository;

import com.hotclick.model.Producto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    Optional<Producto> findBySku(String sku);

    Page<Producto> findByEstadoAndStockActualGreaterThan(Integer estado, Integer stock, Pageable pageable);

    Page<Producto> findByCategoriaIdAndEstado(Long categoriaId, Integer estado, Pageable pageable);

    Page<Producto> findByBodegaIdAndEstado(Long bodegaId, Integer estado, Pageable pageable);

    List<Producto> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    Page<Producto> findByNombreProductoContainingIgnoreCaseAndEstado(String nombre, Integer estado, Pageable pageable);

    @Query("SELECT p FROM Producto p WHERE p.stockActual <= p.stockMinimo AND p.estado = 1")
    List<Producto> findProductosConStockBajo();

    List<Producto> findByEsUnicoTrueAndVendidoFalseAndEstado(Integer estado);

    List<Producto> findByDestacadoTrueAndEstado(Integer estado);

    List<Producto> findByVisibleCatalogoTrueAndEstado(Integer estado, Pageable pageable);

    Long countByAdminClienteIdAndEstado(Long adminId, Integer estado);

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.estado = 1")
    long countProductosActivos();

    @Query("SELECT p.categoria.nombreCategoria, COUNT(p) FROM Producto p WHERE p.estado = 1 GROUP BY p.categoria.nombreCategoria ORDER BY COUNT(p) DESC")
    List<Object[]> countPorCategoria();
}
