package com.hotclick.repository;

import com.hotclick.model.TelegramUpdateProcesado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface TelegramUpdateProcesadoRepository extends JpaRepository<TelegramUpdateProcesado, Long> {

    /** INSERT atómico: un duplicado lanza DataIntegrityViolationException (PK update_id). */
    @Modifying
    @Query(value = "INSERT INTO hot_click_telegram_update_procesado_tb (update_id, creado) VALUES (:id, :creado)",
           nativeQuery = true)
    int insertar(@Param("id") long updateId, @Param("creado") LocalDateTime creado);
}
