package com.hotclick.repository;

import com.hotclick.model.Producto;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Producto p WHERE p.id = :id")
    Optional<Producto> findByIdForUpdate(@Param("id") Long id);

    /** F30 — Batch lock: carga todos los productos en un solo SELECT FOR UPDATE. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Producto p WHERE p.id IN :ids")
    List<Producto> findAllByIdsForUpdate(@Param("ids") List<Long> ids);

    Optional<Producto> findBySku(String sku);

    /** Retorna fk_id_empresa sin cargar el objeto Producto completo. Safe con LAZY empresa. */
    @Query("SELECT p.empresa.id FROM Producto p WHERE p.id = :id")
    Optional<Long> findEmpresaIdById(@Param("id") Long id);

    Optional<Producto> findByBarcode(String barcode);

    @Query("SELECT p FROM Producto p WHERE p.estado = 1 AND p.empresa.id = :empresaId " +
           "AND (LOWER(p.nombreProducto) LIKE LOWER(CONCAT('%',:q,'%')) OR p.sku = :q OR p.barcode = :q)")
    List<Producto> buscarPorTextoOCodigoEnEmpresa(
            @Param("q") String q, @Param("empresaId") Long empresaId, Pageable pageable);

    Page<Producto> findByEstado(Integer estado, Pageable pageable);

    /** Catálogo público: solo negocios aprobados y con visibilidad activada */
    @Query(nativeQuery = true, value =
        "SELECT p.* FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.fk_id_estado = :estado " +
        "AND p.visible_catalogo = TRUE " +
        "AND p.vendido = FALSE " +
        "AND (p.fk_id_empresa IS NULL " +
        "     OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE)) " +
        "ORDER BY p.id_producto DESC",
        countQuery =
        "SELECT COUNT(*) FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.fk_id_estado = :estado " +
        "AND p.visible_catalogo = TRUE " +
        "AND p.vendido = FALSE " +
        "AND (p.fk_id_empresa IS NULL " +
        "     OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    Page<Producto> findByEstadoAndEmpresaAprobada(@Param("estado") Integer estado, Pageable pageable);

    Page<Producto> findByEstadoAndStockActualGreaterThan(Integer estado, Integer stock, Pageable pageable);

    Page<Producto> findByCategoriaIdAndEstado(Long categoriaId, Integer estado, Pageable pageable);

    Page<Producto> findByCategoriaIdAndEstadoAndStockActualGreaterThan(Long categoriaId, Integer estado, Integer stock, Pageable pageable);

    Page<Producto> findByMarcaIdAndEstadoAndStockActualGreaterThan(Long marcaId, Integer estado, Integer stock, Pageable pageable);

    Page<Producto> findByBodegaIdAndEstado(Long bodegaId, Integer estado, Pageable pageable);

    List<Producto> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    Page<Producto> findByNombreProductoContainingIgnoreCaseAndEstado(String nombre, Integer estado, Pageable pageable);

    @Query("SELECT p FROM Producto p WHERE p.stockActual <= p.stockMinimo AND p.estado = 1")
    List<Producto> findProductosConStockBajo();

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.stockActual <= p.stockMinimo AND p.estado = 1")
    long countProductosConStockBajo();

    List<Producto> findByEsUnicoTrueAndVendidoFalseAndEstado(Integer estado);

    List<Producto> findByDestacadoTrueAndEstado(Integer estado);

    List<Producto> findByEnCarruselTrueAndEstadoOrderByOrdenCarruselAsc(Integer estado);

    // ── Versiones filtradas para catálogo público (excluyen negocios no aprobados/invisibles) ──

    @Query(nativeQuery = true, value =
        "SELECT p.* FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.destacado = TRUE AND p.fk_id_estado = :estado " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    List<Producto> findDestacadosPublicos(@Param("estado") Integer estado);

    @Query(nativeQuery = true, value =
        "SELECT p.* FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.en_carrusel = TRUE AND p.fk_id_estado = :estado " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE)) " +
        "ORDER BY p.orden_carrusel ASC NULLS LAST")
    List<Producto> findCarruselPublico(@Param("estado") Integer estado);

    @Query(nativeQuery = true, value =
        "SELECT p.* FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.fk_id_marca = :marcaId AND p.fk_id_estado = :estado AND p.stock_actual > 0 " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))",
        countQuery =
        "SELECT COUNT(*) FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.fk_id_marca = :marcaId AND p.fk_id_estado = :estado AND p.stock_actual > 0 " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    Page<Producto> findByMarcaPublico(@Param("marcaId") Long marcaId, @Param("estado") Integer estado, Pageable pageable);

    @Query(nativeQuery = true, value =
        "SELECT p.* FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.fk_id_categoria = :catId AND p.fk_id_estado = :estado " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))",
        countQuery =
        "SELECT COUNT(*) FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE p.fk_id_categoria = :catId AND p.fk_id_estado = :estado " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    Page<Producto> findByCategoriaPublico(@Param("catId") Long catId, @Param("estado") Integer estado, Pageable pageable);

    @Query(nativeQuery = true, value =
        "SELECT p.* FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%',:q,'%')) AND p.fk_id_estado = :estado " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))",
        countQuery =
        "SELECT COUNT(*) FROM hot_click_producto_tb p " +
        "LEFT JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa " +
        "WHERE LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%',:q,'%')) AND p.fk_id_estado = :estado " +
        "AND (p.fk_id_empresa IS NULL OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    Page<Producto> findByNombrePublico(@Param("q") String q, @Param("estado") Integer estado, Pageable pageable);

    List<Producto> findByVisibleCatalogoTrueAndEstado(Integer estado, Pageable pageable);

    Long countByAdminClienteIdAndEstado(Long adminId, Integer estado);

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.estado = 1")
    long countProductosActivos();

    @Query("SELECT p.categoria.nombreCategoria, COUNT(p) FROM Producto p WHERE p.estado = 1 GROUP BY p.categoria.nombreCategoria ORDER BY COUNT(p) DESC")
    List<Object[]> countPorCategoria();

    @Modifying
    @Query("UPDATE Producto p SET p.estado = 0 WHERE p.fechaAgotado IS NOT NULL AND p.fechaAgotado < :limite AND p.estado = 1")
    int inactivarProductosAgotadosAntesDe(@Param("limite") LocalDateTime limite);

    /** Productos activos con stock > 0 y visibles en catálogo — para el feed de Google Shopping */
    @Query("SELECT p FROM Producto p LEFT JOIN FETCH p.marca WHERE p.estado = 1 AND p.stockActual > 0 AND p.visibleCatalogo = true ORDER BY p.id ASC")
    List<Producto> findParaFeed();

    /** Productos activos y visibles en catálogo (sin filtro de stock) — para sitemap */
    @Query("SELECT p FROM Producto p LEFT JOIN FETCH p.categoria WHERE p.estado = 1 AND p.visibleCatalogo = true ORDER BY p.id ASC")
    List<Producto> findActivosVisibles();

    /** Productos activos sin publicación en Facebook — para el scheduler, paginado */
    @Query("SELECT p FROM Producto p WHERE p.estado = 1 AND NOT EXISTS (SELECT 1 FROM PublicacionFacebook fb WHERE fb.producto.id = p.id) ORDER BY p.id ASC")
    List<Producto> findActivosSinPublicacion(Pageable pageable);

    @Query("SELECT p FROM Producto p WHERE p.empresa.id = :empresaId AND p.estado = :estado")
    Page<Producto> findByEmpresaIdAndEstado(@Param("empresaId") Long empresaId, @Param("estado") Integer estado, Pageable pageable);

    /** Catálogo público de una tienda por slug: solo visibles en catálogo, con stock. */
    @Query("SELECT p FROM Producto p WHERE p.empresa.id = :empresaId AND p.estado = 1 " +
           "AND p.visibleCatalogo = true AND p.stockActual > 0 AND p.vendido = false ORDER BY p.id DESC")
    Page<Producto> findCatalogoPublicoByEmpresa(@Param("empresaId") Long empresaId, Pageable pageable);

    /** Búsqueda de texto en la tienda pública de un tenant. */
    @Query("SELECT p FROM Producto p WHERE p.empresa.id = :empresaId AND p.estado = 1 " +
           "AND p.visibleCatalogo = true AND p.stockActual > 0 AND p.vendido = false " +
           "AND LOWER(p.nombreProducto) LIKE LOWER(CONCAT('%',:q,'%')) ORDER BY p.id DESC")
    Page<Producto> findCatalogoPublicoByEmpresaAndNombre(
            @Param("empresaId") Long empresaId, @Param("q") String q, Pageable pageable);

    /** Catálogo de una tienda filtrado por categoría. */
    @Query("SELECT p FROM Producto p WHERE p.empresa.id = :empresaId AND p.categoria.id = :catId " +
           "AND p.estado = 1 AND p.visibleCatalogo = true AND p.stockActual > 0 AND p.vendido = false ORDER BY p.id DESC")
    Page<Producto> findCatalogoPublicoByEmpresaAndCategoria(
            @Param("empresaId") Long empresaId, @Param("catId") Long catId, Pageable pageable);

    /** Producto individual en tienda pública — valida que sea visible y tenga stock. */
    @Query("SELECT p FROM Producto p WHERE p.empresa.id = :empresaId AND p.id = :id " +
           "AND p.estado = 1 AND p.visibleCatalogo = true")
    java.util.Optional<Producto> findProductoPublicoByEmpresaAndId(
            @Param("empresaId") Long empresaId, @Param("id") Long id);

    @Query("SELECT p FROM Producto p WHERE p.estado = 1 AND (p.stockActual IS NULL OR p.stockActual <= 0) AND p.empresa.id = :empresaId")
    List<Producto> findActivosSinStockByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Producto p WHERE p.estado = 1 AND (p.stockActual IS NULL OR p.stockActual <= 0)")
    List<Producto> findActivosSinStock();

    @Query("SELECT p FROM Producto p WHERE p.estado = 1 AND p.empresa.id = :empresaId")
    List<Producto> findActivosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Producto p WHERE p.estado = 1")
    List<Producto> findAllActivos();

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.empresa.id = :empresaId AND p.estado = 1")
    long countProductosActivosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.empresa.id = :empresaId AND p.stockActual <= p.stockMinimo AND p.estado = 1")
    long countProductosConStockBajoByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT p.categoria.nombreCategoria, COUNT(p) FROM Producto p WHERE p.empresa.id = :empresaId AND p.estado = 1 GROUP BY p.categoria.nombreCategoria ORDER BY COUNT(p) DESC")
    List<Object[]> countPorCategoriaByEmpresaId(@Param("empresaId") Long empresaId);

    // ── Ofertas ──────────────────────────────────────────────────────────────

    @Query("SELECT p FROM Producto p WHERE p.categoria.id = :catId AND p.empresa.id = :empId AND p.estado = 1")
    List<Producto> findByCategoriaIdAndEmpresaId(@Param("catId") Long catId, @Param("empId") Long empId);

    @Query("SELECT p FROM Producto p WHERE p.categoria.id = :catId AND p.estado = 1")
    List<Producto> findByCategoriaId(@Param("catId") Long catId);

    @Query("SELECT p FROM Producto p WHERE p.enOferta = true AND p.visibleCatalogo = true AND p.empresa.id = :empId AND p.estado = 1")
    List<Producto> findByEnOfertaTrueAndEmpresaIdAndVisibleCatalogoTrue(@Param("empId") Long empId);

    @Query("SELECT p FROM Producto p LEFT JOIN p.empresa e WHERE p.enOferta = true AND p.visibleCatalogo = true AND p.estado = 1 AND (p.empresa IS NULL OR (e.estadoEmpresa = 'ACTIVO' AND e.visibilidadPublica = true))")
    List<Producto> findByEnOfertaTrueAndVisibleCatalogoTrue();
}
