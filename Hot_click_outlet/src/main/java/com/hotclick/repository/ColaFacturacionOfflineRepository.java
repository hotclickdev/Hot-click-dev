package com.hotclick.repository;

import com.hotclick.model.ColaFacturacionOffline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ColaFacturacionOfflineRepository extends JpaRepository<ColaFacturacionOffline, Long> {

    boolean existsByComprobanteId(Long comprobanteId);

    /**
     * Reclama hasta {@code limite} filas PENDIENTE listas para reintentar y las marca
     * PROCESANDO en un único statement atómico (CTE + UPDATE ... RETURNING).
     *
     * FOR UPDATE SKIP LOCKED evita que dos ejecuciones que coincidan en el tiempo
     * (ej. el lock de ShedLock vence por una pausa larga de GC mientras el pod
     * anterior aún no terminó) reclamen la misma fila dos veces. Debe llamarse
     * dentro de una transacción corta y propia (REQUIRES_NEW), nunca compartiendo
     * transacción con el envío HTTP a Hacienda.
     */
    @Query(value = """
        WITH claimed AS (
            SELECT id_cola_offline
            FROM hot_click_cola_facturacion_offline_tb
            WHERE estado = 'PENDIENTE'
              AND fecha_proximo_intento <= now()
            ORDER BY fecha_creacion ASC
            LIMIT :limite
            FOR UPDATE SKIP LOCKED
        )
        UPDATE hot_click_cola_facturacion_offline_tb c
        SET estado = 'PROCESANDO', fecha_inicio_proceso = now()
        FROM claimed
        WHERE c.id_cola_offline = claimed.id_cola_offline
        RETURNING c.*
        """, nativeQuery = true)
    List<ColaFacturacionOffline> reclamarPendientes(@Param("limite") int limite);
}
