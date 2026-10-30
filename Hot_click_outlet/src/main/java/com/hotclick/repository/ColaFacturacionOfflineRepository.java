package com.hotclick.repository;

import com.hotclick.model.ColaFacturacionOffline;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ColaFacturacionOfflineRepository extends JpaRepository<ColaFacturacionOffline, Long> {

    boolean existsByComprobanteId(Long comprobanteId);

    /**
     * Filas PENDIENTE listas para reintentar, bloqueadas con SELECT ... FOR UPDATE SKIP LOCKED
     * (PESSIMISTIC_WRITE + lock.timeout=-2). Portable: PostgreSQL (producción) y H2 (tests/QA).
     *
     * SKIP LOCKED evita que dos ejecuciones que coincidan en el tiempo (ej. el lock de ShedLock vence
     * por una pausa larga de GC mientras el pod anterior aún no terminó) reclamen la misma fila dos
     * veces. Debe llamarse dentro de la transacción corta y propia (REQUIRES_NEW) de
     * {@code ColaFacturacionOfflineTxOps.reclamarLote}, que marca PROCESANDO antes de confirmar;
     * nunca compartiendo transacción con el envío HTTP a Hacienda.
     *
     * Antes era una CTE + UPDATE ... FROM ... RETURNING nativa, válida solo en PostgreSQL: en H2
     * fallaba con error de sintaxis en cada corrida del scheduler.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT c FROM ColaFacturacionOffline c " +
           "WHERE c.estado = 'PENDIENTE' AND c.fechaProximoIntento <= :ahora " +
           "ORDER BY c.fechaCreacion ASC")
    List<ColaFacturacionOffline> bloquearPendientesListas(@Param("ahora") LocalDateTime ahora, Pageable limite);

    /**
     * L4 (#406): filas PROCESANDO cuyo reclamo es anterior a {@code limite} (o sin fecha de inicio): el proceso que
     * las reclamó murió o se reinició antes de marcarlas COMPLETADO/fallo y nadie más las toma. Bloqueadas con
     * PESSIMISTIC_WRITE + SKIP LOCKED (portable H2/PostgreSQL) para que dos pods no las recuperen a la vez.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT c FROM ColaFacturacionOffline c " +
           "WHERE c.estado = 'PROCESANDO' AND (c.fechaInicioProceso IS NULL OR c.fechaInicioProceso < :limite) " +
           "ORDER BY c.fechaCreacion ASC")
    List<ColaFacturacionOffline> bloquearProcesandoTrabadas(@Param("limite") LocalDateTime limite, Pageable lote);

    /**
     * BAJO-2 (#428): renueva el reloj de una fila mientras se procesa, para que un lote largo (hasta 20 filas, cada
     * envío con reintentos) no la deje pasar por "trabada" aunque el proceso siga vivo. Solo toca filas todavía
     * PROCESANDO; devuelve 0 si otra corrida ya la recuperó (así no se envía dos veces desde dos procesos).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ColaFacturacionOffline c SET c.fechaInicioProceso = :ahora " +
           "WHERE c.id = :id AND c.estado = 'PROCESANDO'")
    int renovarInicioProceso(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);
}
