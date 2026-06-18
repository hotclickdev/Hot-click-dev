package com.hotclick.repository;

import com.hotclick.model.WalletAcreditacionFallida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WalletAcreditacionFallidaRepository extends JpaRepository<WalletAcreditacionFallida, Long> {

    boolean existsByPedidoId(Long pedidoId);

    @Query("""
        SELECT d FROM WalletAcreditacionFallida d
         WHERE d.estado = 'PENDIENTE_REINTENTO'
           AND d.fechaProximoIntento <= :ahora
         ORDER BY d.fechaProximoIntento ASC
        """)
    List<WalletAcreditacionFallida> findPendientesParaReintento(@Param("ahora") LocalDateTime ahora);
}
