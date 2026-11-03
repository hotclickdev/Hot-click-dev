package com.hotclick.repository;

import com.hotclick.model.TelegramBloqueoEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TelegramBloqueoEmpresaRepository extends JpaRepository<TelegramBloqueoEmpresa, Long> {

    boolean existsByUsuarioIdAndEmpresaId(Long usuarioId, Long empresaId);

    @Query("SELECT b.empresaId FROM TelegramBloqueoEmpresa b WHERE b.usuarioId = :usuarioId")
    List<Long> findEmpresaIdsByUsuarioId(@Param("usuarioId") Long usuarioId);
}
