package com.hotclick.repository;

import com.hotclick.model.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    Optional<Pago> findByMerchantToken(String merchantToken);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId AND p.usuario.id = :usuarioId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoIdAndUsuarioId(Long pedidoId, Long usuarioId);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoId(Long pedidoId);
}
