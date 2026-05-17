package com.hotclick.repository;

import com.hotclick.model.Pago;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    Optional<Pago> findByMerchantToken(String merchantToken);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId AND p.usuario.id = :usuarioId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoIdAndUsuarioId(Long pedidoId, Long usuarioId);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoId(Long pedidoId);

    @Query("SELECT p FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaCreacion < :corte")
    List<Pago> findExpiradosPendientes(LocalDateTime corte);

    @Query("SELECT p FROM Pago p WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) ORDER BY p.fechaCreacion DESC")
    Page<Pago> buscarPagos(@Param("proveedor") String proveedor, @Param("estadoPago") String estadoPago, Pageable pageable);
}
