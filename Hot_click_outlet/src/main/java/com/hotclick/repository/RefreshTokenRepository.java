package com.hotclick.repository;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    // JOIN FETCH de roles/empresa evita LazyInitializationException en /api/auth/refresh
    // (open-in-view=false — la sesión Hibernate ya cerró cuando el controller lee usuario.getRoles()).
    @Query("SELECT r FROM RefreshToken r JOIN FETCH r.usuario u LEFT JOIN FETCH u.roles LEFT JOIN FETCH u.empresa WHERE r.token = :token")
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now WHERE r.usuario = :usuario AND r.revokedAt IS NULL")
    void revokeAllByUsuario(Usuario usuario, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :now")
    void deleteExpired(LocalDateTime now);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.revokedAt IS NOT NULL AND r.revokedAt < :corte")
    void deleteRevoked(LocalDateTime corte);
}
