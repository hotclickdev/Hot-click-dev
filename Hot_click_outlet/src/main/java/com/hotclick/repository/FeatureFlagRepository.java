package com.hotclick.repository;

import com.hotclick.model.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, Long> {

    Optional<FeatureFlag> findByNombre(String nombre);

    List<FeatureFlag> findAllByOrderByNombreAsc();

    /**
     * Retorna los nombres de flags activos para una empresa específica.
     * Filtra por activo=true y fecha_exp nula o futura (soporte de A/B con expiración).
     */
    @Query(nativeQuery = true, value = """
        SELECT f.nombre
        FROM hot_click_feature_flag_tb f
        LEFT JOIN hot_click_empresa_feature_tb ef
            ON ef.fk_id_flag = f.id_flag AND ef.fk_id_empresa = :empresaId
        WHERE COALESCE(ef.activo, f.activo_defecto) = true
          AND (ef.fecha_exp IS NULL OR ef.fecha_exp > NOW())
        """)
    List<String> findNombresActivosParaEmpresa(@Param("empresaId") Long empresaId);

    /**
     * Estado detallado de todos los flags para una empresa:
     * nombre, descripcion, activo (override), fecha_exp.
     * Incluye flags sin override (LEFT JOIN) mostrando activo_defecto.
     */
    @Query(nativeQuery = true, value = """
        SELECT
            f.id_flag        AS id,
            f.nombre         AS nombre,
            f.descripcion    AS descripcion,
            COALESCE(ef.activo, f.activo_defecto) AS activo,
            ef.fecha_exp     AS fechaExp,
            (ef.fk_id_empresa IS NOT NULL) AS tieneOverride
        FROM hot_click_feature_flag_tb f
        LEFT JOIN hot_click_empresa_feature_tb ef
            ON ef.fk_id_flag = f.id_flag AND ef.fk_id_empresa = :empresaId
        ORDER BY f.nombre
        """)
    List<Object[]> findEstadoFlagsParaEmpresa(@Param("empresaId") Long empresaId);
}
