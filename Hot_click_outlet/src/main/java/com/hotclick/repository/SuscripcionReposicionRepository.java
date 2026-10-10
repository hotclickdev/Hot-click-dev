package com.hotclick.repository;

import com.hotclick.model.SuscripcionReposicion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SuscripcionReposicionRepository extends JpaRepository<SuscripcionReposicion, Long> {

    boolean existsByProducto_IdAndCorreoIgnoreCase(Long productoId, String correo);

    Optional<SuscripcionReposicion> findByProducto_IdAndCorreoIgnoreCase(Long productoId, String correo);

    List<SuscripcionReposicion> findByProducto_IdAndNotificadoFalse(Long productoId);

    /** Marca la suscripción como avisada solo si seguía pendiente: 1 = este hilo envía el correo. */
    @Transactional
    @Modifying
    @Query("UPDATE SuscripcionReposicion s SET s.notificado = true, s.fechaNotificacion = :ahora "
         + "WHERE s.id = :id AND s.notificado = false")
    int reclamarParaAviso(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    /** Si el correo falló, la suscripción vuelve a quedar pendiente para la próxima reposición. */
    @Transactional
    @Modifying
    @Query("UPDATE SuscripcionReposicion s SET s.notificado = false, s.fechaNotificacion = null WHERE s.id = :id")
    int liberarAviso(@Param("id") Long id);
}
