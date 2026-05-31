package com.hotclick.repository;

import com.hotclick.model.MiembroEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MiembroEmpresaRepository extends JpaRepository<MiembroEmpresa, Long> {

    List<MiembroEmpresa> findByUsuarioIdAndEstado(Long usuarioId, Integer estado);

    List<MiembroEmpresa> findByEmpresaIdAndEstado(Long empresaId, Integer estado);

    Optional<MiembroEmpresa> findByUsuarioIdAndEmpresaId(Long usuarioId, Long empresaId);

    Optional<MiembroEmpresa> findByUsuarioIdAndEmpresaIdAndEstado(Long usuarioId, Long empresaId, Integer estado);

    boolean existsByUsuarioIdAndEmpresaIdAndEstado(Long usuarioId, Long empresaId, Integer estado);

    @Query("SELECT COUNT(m) FROM MiembroEmpresa m WHERE m.usuario.id = :usuarioId AND m.estado = 1")
    long countEmpresasByUsuarioId(@Param("usuarioId") Long usuarioId);
}
