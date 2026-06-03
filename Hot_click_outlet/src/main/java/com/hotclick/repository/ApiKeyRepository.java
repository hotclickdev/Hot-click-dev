package com.hotclick.repository;

import com.hotclick.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    Optional<ApiKey> findByKeyHashAndActivoTrue(String keyHash);

    // JOIN FETCH empresa para que la entidad cacheada tenga empresa en memoria (no proxy)
    @Query("SELECT k FROM ApiKey k JOIN FETCH k.empresa WHERE k.keyHash = :hash AND k.activo = true")
    Optional<ApiKey> findByHashWithEmpresa(@Param("hash") String hash);

    List<ApiKey> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId);

    @Modifying
    @Transactional
    @Query("UPDATE ApiKey k SET k.ultimoUso = :fecha WHERE k.id = :id")
    void updateUltimoUso(@Param("id") Long id, @Param("fecha") LocalDateTime fecha);
}
