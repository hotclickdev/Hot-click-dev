package com.hotclick.repository;

import com.hotclick.model.PedidoRetiroToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRetiroTokenRepository extends JpaRepository<PedidoRetiroToken, Long> {

    Optional<PedidoRetiroToken> findByToken(String token);

    Optional<PedidoRetiroToken> findByPedidoId(Long pedidoId);

    List<PedidoRetiroToken> findByPedidoIdIn(Collection<Long> pedidoIds);

    /**
     * Canje atómico y de un solo uso: solo gana quien encuentra el token PENDIENTE, vigente y de SU empresa.
     * 0 filas = no existe, ya usado, vencido o de otra empresa (el llamador no distingue ni filtra datos).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PedidoRetiroToken t SET t.estado = 'PRESENTADO', t.fechaCanje = :ahora, t.usuarioCanjeId = :usuarioId "
         + "WHERE t.token = :token AND t.estado = 'PENDIENTE' AND t.expira > :ahora AND t.empresaId = :empresaId")
    int canjear(@Param("token") String token, @Param("empresaId") Long empresaId,
                @Param("usuarioId") Long usuarioId, @Param("ahora") LocalDateTime ahora);

    /** Marca VENCIDO los QR no usados cuya vigencia terminó (el stock ya cobrado no se libera). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PedidoRetiroToken t SET t.estado = 'VENCIDO' WHERE t.estado = 'PENDIENTE' AND t.expira <= :ahora")
    int marcarVencidos(@Param("ahora") LocalDateTime ahora);
}
