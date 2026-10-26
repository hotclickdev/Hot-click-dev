package com.hotclick.repository;

import com.hotclick.model.SuspensionExtension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SuspensionExtensionRepository extends JpaRepository<SuspensionExtension, Long> {

    boolean existsBySuscripcionId(Long suscripcionId);

    Optional<SuspensionExtension> findTopByEmpresaIdOrderByOtorgadaEnDesc(Long empresaId);

    /** Extensión vigente (vence_en en el futuro). Vacío = fail-closed: sin permisos de extensión. */
    Optional<SuspensionExtension> findTopByEmpresaIdAndVenceEnAfterOrderByVenceEnDesc(Long empresaId, LocalDateTime ahora);

    /** Empresas en EXTENSION_IMPAGO sin extensión vigente: deben volver a SUSPENDIDO_IMPAGO. */
    @Query("SELECT e.id FROM Empresa e WHERE e.estadoEmpresa = 'EXTENSION_IMPAGO' AND NOT EXISTS ("
         + "SELECT x.id FROM SuspensionExtension x WHERE x.empresaId = e.id AND x.venceEn > :ahora)")
    List<Long> findEmpresasConExtensionVencida(@Param("ahora") LocalDateTime ahora);

    /** Admin (anti N+1): ciclos que ya usaron su extensión. */
    @Query("SELECT x.suscripcionId FROM SuspensionExtension x WHERE x.suscripcionId IN :ids")
    List<Long> findSuscripcionIdsUsadas(@Param("ids") java.util.Collection<Long> ids);

    /** Admin (anti N+1): extensiones de varias empresas, más recientes primero. */
    @Query("SELECT x FROM SuspensionExtension x WHERE x.empresaId IN :ids ORDER BY x.otorgadaEn DESC")
    List<SuspensionExtension> findByEmpresaIdsRecientes(@Param("ids") java.util.Collection<Long> ids);
}
