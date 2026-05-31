package com.hotclick.repository;

import com.hotclick.model.Marca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MarcaRepository extends JpaRepository<Marca, Long> {

    List<Marca> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    boolean existsByNombreMarcaAndEstado(String nombreMarca, Integer estado);

    boolean existsByNombreMarcaAndEstadoAndIdNot(String nombreMarca, Integer estado, Long id);

    List<Marca> findByEstado(Integer estado);

    @Query(nativeQuery = true, value =
        "SELECT m.* FROM hot_click_marca_tb m " +
        "LEFT JOIN hot_click_empresa_tb e ON m.fk_id_empresa = e.id_empresa " +
        "WHERE m.fk_id_estado = :estado " +
        "AND (m.fk_id_empresa IS NULL " +
        "     OR (e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE))")
    List<Marca> findPublicasByEstado(@Param("estado") Integer estado);

    @Query("SELECT m FROM Marca m WHERE m.empresa.id = :empresaId AND m.estado = :estado")
    List<Marca> findByEmpresaIdAndEstado(@Param("empresaId") Long empresaId, @Param("estado") Integer estado);

    @Query("SELECT CASE WHEN (COUNT(m) > 0) THEN true ELSE false END FROM Marca m WHERE m.nombreMarca = :nombre AND m.empresa.id = :empresaId AND m.estado = :estado")
    boolean existsByNombreMarcaAndEmpresaIdAndEstado(@Param("nombre") String nombreMarca, @Param("empresaId") Long empresaId, @Param("estado") Integer estado);

    @Query("SELECT CASE WHEN (COUNT(m) > 0) THEN true ELSE false END FROM Marca m WHERE m.nombreMarca = :nombre AND m.empresa.id = :empresaId AND m.estado = :estado AND m.id <> :id")
    boolean existsByNombreMarcaAndEmpresaIdAndEstadoAndIdNot(@Param("nombre") String nombreMarca, @Param("empresaId") Long empresaId, @Param("estado") Integer estado, @Param("id") Long id);
}
