package com.hotclick.repository;

import com.hotclick.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByEstado(Integer estado);

    Optional<Categoria> findBySlug(String slug);

    /** Categorías globales con suficientes productos públicos para una landing. */
    @Query(nativeQuery = true, value =
        "SELECT c.slug, c.nombre_categoria, c.descripcion, COUNT(p.id_producto) " +
        "FROM hot_click_categoria_tb c " +
        "INNER JOIN hot_click_producto_tb p ON p.fk_id_categoria = c.id_categoria " +
        "INNER JOIN hot_click_empresa_tb e ON e.id_empresa = p.fk_id_empresa " +
        "WHERE c.fk_id_empresa IS NULL AND c.fk_id_estado = 1 " +
        "AND c.slug IS NOT NULL AND trim(c.slug) <> '' " +
        "AND p.fk_id_estado = 1 AND p.visible_catalogo = TRUE AND p.vendido = FALSE " +
        "AND e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE " +
        "GROUP BY c.id_categoria, c.slug, c.nombre_categoria, c.descripcion " +
        "HAVING COUNT(p.id_producto) >= :minimo " +
        "ORDER BY c.nombre_categoria")
    List<Object[]> findSectoresIndexables(@Param("minimo") int minimo);

    @Query(nativeQuery = true, value =
        "SELECT c.* FROM hot_click_categoria_tb c " +
        "LEFT JOIN hot_click_empresa_tb e ON c.fk_id_empresa = e.id_empresa " +
        "WHERE c.fk_id_estado = :estado " +
        "AND (c.fk_id_empresa IS NULL " +
        "     OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    List<Categoria> findPublicasByEstado(@Param("estado") Integer estado);

    List<Categoria> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    List<Categoria> findByCategoriaPadreIdAndEstado(Long padreId, Integer estado);

    List<Categoria> findByNombreCategoriaContainingIgnoreCaseAndEstado(String nombre, Integer estado);

    @Query("SELECT c FROM Categoria c WHERE c.empresa.id = :empresaId AND c.estado = :estado")
    List<Categoria> findByEmpresaIdAndEstado(@Param("empresaId") Long empresaId, @Param("estado") Integer estado);

    // Categorías son ahora exclusivas de ADMIN y se crean globales (empresa = NULL) para que
    // las vea todo negocio; se conservan también las creadas antes por cada empresa (legado).
    @Query("SELECT c FROM Categoria c WHERE c.estado = :estado AND (c.empresa.id = :empresaId OR c.empresa IS NULL)")
    List<Categoria> findByEmpresaIdOrNoEmpresaAndEstado(@Param("empresaId") Long empresaId, @Param("estado") Integer estado);

    /** POS: solo categorías donde este negocio tiene al menos un producto activo. */
    @Query("SELECT DISTINCT c FROM Producto p JOIN p.categoria c "
        + "WHERE p.empresa.id = :empresaId AND p.estado = :estado AND c.estado = :estado "
        + "ORDER BY c.nombreCategoria")
    List<Categoria> findConProductosDeEmpresa(
        @Param("empresaId") Long empresaId, @Param("estado") Integer estado);
}
