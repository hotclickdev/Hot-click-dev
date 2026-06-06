package com.hotclick.repository;

import com.hotclick.model.WaMensajeLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WaMensajeLogRepository extends JpaRepository<WaMensajeLog, Long> {

    List<WaMensajeLog> findByUsuarioIdOrderByFechaEnvioDesc(Long usuarioId, Pageable pageable);

    @Query("SELECT w FROM WaMensajeLog w WHERE w.empresaId = :empresaId ORDER BY w.fechaEnvio DESC")
    List<WaMensajeLog> findByEmpresaIdRecientes(@Param("empresaId") Long empresaId, Pageable pageable);

    @Query("SELECT COUNT(w) FROM WaMensajeLog w WHERE w.empresaId = :empresaId AND w.estado = 'ENVIADO'")
    long countEnviadosByEmpresa(@Param("empresaId") Long empresaId);
}
