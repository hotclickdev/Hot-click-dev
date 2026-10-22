package com.hotclick.repository;

import com.hotclick.model.WalletAcreditacionFallida;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import jakarta.persistence.QueryHint;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WalletAcreditacionFallidaRepository extends JpaRepository<WalletAcreditacionFallida, Long> {

    boolean existsByPedidoId(Long pedidoId);

    @Query("""
        SELECT d FROM WalletAcreditacionFallida d
         WHERE d.estado = 'PENDIENTE_REINTENTO'
           AND d.fechaProximoIntento <= :ahora
         ORDER BY d.fechaProximoIntento ASC, d.id ASC
        """)
    List<WalletAcreditacionFallida> findPendientesParaReintento(@Param("ahora") LocalDateTime ahora);

    /** Igual que findPendientesParaReintento pero limitado a una página (lotes acotados), con timeout de 15 s. */
    @QueryHints(@QueryHint(name = "jakarta.persistence.query.timeout", value = "15000"))
    @Query("""
        SELECT d FROM WalletAcreditacionFallida d
         WHERE d.estado = 'PENDIENTE_REINTENTO'
           AND d.fechaProximoIntento <= :ahora
         ORDER BY d.fechaProximoIntento ASC, d.id ASC
        """)
    List<WalletAcreditacionFallida> findPendientesParaReintento(@Param("ahora") LocalDateTime ahora, Pageable pagina);

    /**
     * Transiciones condicionales: solo afectan filas todavía PENDIENTE_REINTENTO (y, para fallos, con el
     * número de intentos leído), así un humano u otro proceso que ya cerró el ítem nunca se pisa.
     * Devuelven filas afectadas (0 = el ítem cambió entretanto y se ignora).
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        UPDATE WalletAcreditacionFallida d
           SET d.estado = 'PROCESADO', d.fechaCompletado = :ahora
         WHERE d.id = :id AND d.estado = 'PENDIENTE_REINTENTO'
        """)
    int marcarProcesadoSiPendiente(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        UPDATE WalletAcreditacionFallida d
           SET d.estado = :estado, d.intentos = :intentos, d.ultimoError = :error,
               d.fechaProximoIntento = :proximo
         WHERE d.id = :id AND d.estado = 'PENDIENTE_REINTENTO' AND d.intentos = :intentosPrevios
        """)
    int registrarFalloSiPendiente(@Param("id") Long id, @Param("intentosPrevios") int intentosPrevios,
                                  @Param("intentos") int intentos, @Param("estado") String estado,
                                  @Param("error") String error, @Param("proximo") LocalDateTime proximo);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        UPDATE WalletAcreditacionFallida d
           SET d.estado = 'AGOTADO', d.ultimoError = :motivo
         WHERE d.id = :id AND d.estado = 'PENDIENTE_REINTENTO'
        """)
    int marcarAgotadoSiPendiente(@Param("id") Long id, @Param("motivo") String motivo);
}
