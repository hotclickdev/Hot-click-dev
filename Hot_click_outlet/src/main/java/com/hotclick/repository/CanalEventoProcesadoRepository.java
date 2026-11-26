package com.hotclick.repository;

import com.hotclick.model.CanalEventoProcesado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface CanalEventoProcesadoRepository extends JpaRepository<CanalEventoProcesado, String> {

    /** INSERT atómico: un duplicado lanza DataIntegrityViolationException (PK evento_id). */
    @Modifying
    @Query(value = "INSERT INTO hot_click_canal_evento_procesado_tb (evento_id, canal, creado) VALUES (:id, :canal, :creado)",
           nativeQuery = true)
    int insertar(@Param("id") String eventoId, @Param("canal") String canal, @Param("creado") LocalDateTime creado);

    /** Purga: Meta no reintenta un webhook más allá de unos días. */
    @Modifying
    @Query(value = "DELETE FROM hot_click_canal_evento_procesado_tb WHERE creado < :limite", nativeQuery = true)
    int borrarAnteriores(@Param("limite") LocalDateTime limite);
}
