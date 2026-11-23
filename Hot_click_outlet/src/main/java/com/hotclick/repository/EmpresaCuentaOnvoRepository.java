package com.hotclick.repository;

import com.hotclick.model.EmpresaCuentaOnvo;
import org.springframework.data.domain.Pageable;
import com.hotclick.model.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmpresaCuentaOnvoRepository extends JpaRepository<EmpresaCuentaOnvo, Long> {
    Optional<EmpresaCuentaOnvo> findByEmpresaId(Long empresaId);

    List<EmpresaCuentaOnvo> findByEmpresaIdIn(Collection<Long> empresaIds);
    List<EmpresaCuentaOnvo> findByEstadoInOrderByActualizadoEnAsc(Collection<String> estados, Pageable pageable);

    List<EmpresaCuentaOnvo> findByPerdidaDesdeIsNotNullOrderByActualizadoEnAsc(Pageable pageable);

    List<EmpresaCuentaOnvo> findByRecuperadaAvisoPendienteTrueOrderByActualizadoEnAsc(Pageable pageable);

    /** Claim atómico del aviso único «listo para revisión»: 1 = lo reclamó este llamador; 0 = ya estaba reclamado. */
    @Modifying
    @Query("UPDATE EmpresaCuentaOnvo c SET c.revisionAvisoEn = :ahora WHERE c.id = :id AND c.revisionAvisoEn IS NULL")
    int reclamarAvisoRevision(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    /** Claim atómico de un aviso de pérdida (el primero o un recordatorio): respeta intervalo y tope. */
    @Modifying
    @Query("UPDATE EmpresaCuentaOnvo c SET c.avisosPerdida = c.avisosPerdida + 1, c.ultimoAvisoPerdidaEn = :ahora "
        + "WHERE c.id = :id AND c.perdidaDesde IS NOT NULL AND c.avisosPerdida < :max "
        + "AND (c.ultimoAvisoPerdidaEn IS NULL OR c.ultimoAvisoPerdidaEn <= :limite)")
    int reclamarAvisoPerdida(@Param("id") Long id, @Param("ahora") LocalDateTime ahora,
                             @Param("limite") LocalDateTime limite, @Param("max") int max);

    /** Claim atómico del aviso «cobros reanudados» (una sola vez por recuperación). */
    @Modifying
    @Query("UPDATE EmpresaCuentaOnvo c SET c.recuperadaAvisoPendiente = false, c.avisosPerdida = 0, "
        + "c.ultimoAvisoPerdidaEn = NULL WHERE c.id = :id AND c.recuperadaAvisoPendiente = true")
    int reclamarAvisoRecuperada(@Param("id") Long id);

    /** Cola «Revisión HotClick»: negocios por fases pendientes de aprobación cuya cuenta ONVO ya está ACTIVA. */
    @Query("SELECT e FROM Empresa e, EmpresaCuentaOnvo c WHERE c.empresaId = e.id AND e.altaPorFases = true "
        + "AND e.estadoEmpresa = 'PENDIENTE_APROBACION' AND c.estado = 'ACTIVA' ORDER BY c.activadaEn ASC, e.id ASC")
    List<Empresa> negociosEnRevision(Pageable pageable);

    /** Negocios existentes (no por fases), ACTIVOS y sin cuenta ONVO ACTIVA: candidatos a migrar al flujo por fases. */
    @Query("SELECT e.id FROM Empresa e WHERE e.altaPorFases = false AND e.estadoEmpresa = 'ACTIVO' "
        + "AND NOT EXISTS (SELECT 1 FROM EmpresaCuentaOnvo c WHERE c.empresaId = e.id AND c.estado = 'ACTIVA') ORDER BY e.id")
    List<Long> idsExistentesParaMigrar(Pageable pageable);

    /** Idempotente: solo toca los que siguen siendo existentes y ACTIVOS. */
    @Modifying
    @Query("UPDATE Empresa e SET e.altaPorFases = true, e.ventaOnlineHabilitada = false "
        + "WHERE e.id IN :ids AND e.altaPorFases = false AND e.estadoEmpresa = 'ACTIVO'")
    int migrarAFases(@Param("ids") Collection<Long> ids);
}
