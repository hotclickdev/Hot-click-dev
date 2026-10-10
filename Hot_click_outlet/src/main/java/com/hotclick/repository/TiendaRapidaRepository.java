package com.hotclick.repository;

import com.hotclick.model.TiendaRapida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

public interface TiendaRapidaRepository extends JpaRepository<TiendaRapida, Long> {

    Optional<TiendaRapida> findByToken(String token);

    List<TiendaRapida> findAllByOrderByCreadaDesc();

    Optional<TiendaRapida> findByTokenHash(String tokenHash);

    Optional<TiendaRapida> findFirstByEmpresaIdOrderByCreadaDesc(Long empresaId);

    /** Consume el enlace en una sola sentencia: solo una petición concurrente obtiene 1. */
    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("UPDATE TiendaRapida t SET t.usadoEn = :ahora WHERE t.id = :id AND t.usadoEn IS NULL "
         + "AND t.revocadoEn IS NULL AND t.enlaceVence > :ahora")
    int consumir(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);
}
