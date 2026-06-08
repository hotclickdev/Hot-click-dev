package com.hotclick.repository;

import com.hotclick.model.PosQrSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PosQrSesionRepository extends JpaRepository<PosQrSesion, Long> {

    Optional<PosQrSesion> findByToken(String token);

    @Modifying
    @Query("""
        UPDATE PosQrSesion s SET s.estado = 'EXPIRADO'
        WHERE s.estado = 'PENDIENTE' AND s.fechaExpiracion < :ahora
        """)
    int expirarSesionesVencidas(@Param("ahora") LocalDateTime ahora);
}
