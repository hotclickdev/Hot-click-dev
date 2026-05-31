package com.hotclick.repository;

import com.hotclick.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByEstado(Integer estado);

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
}
