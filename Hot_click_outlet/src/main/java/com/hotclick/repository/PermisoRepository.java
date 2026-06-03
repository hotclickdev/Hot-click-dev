package com.hotclick.repository;

import com.hotclick.model.Permiso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PermisoRepository extends JpaRepository<Permiso, Integer> {

    @Query(value = """
        SELECT DISTINCT p.nombre_permiso
        FROM hot_click_permiso_tb p
        JOIN hot_click_rol_permiso_tb rp ON rp.fk_id_permiso = p.id_permiso
        JOIN hot_click_usuario_rol_tb ur ON ur.fk_id_rol = rp.fk_id_rol
        WHERE ur.fk_id_usuario = :userId
          AND p.fk_id_estado = 1
          AND rp.fk_id_estado = 1
        """, nativeQuery = true)
    List<String> findPermisosByUsuarioId(@Param("userId") Long userId);
}
