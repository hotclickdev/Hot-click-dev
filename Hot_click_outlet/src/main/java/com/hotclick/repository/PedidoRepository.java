package com.hotclick.repository;

import com.hotclick.model.Pedido;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Optional<Pedido> findByNumeroPedido(String numeroPedido);

    Page<Pedido> findByUsuarioFinalIdOrderByFechaPedidoDesc(Long usuarioId, Pageable pageable);

    List<Pedido> findByEstadoPedidoAndEstado(String estadoPedido, Integer estado);

    Long countByEstadoPedidoAndEstado(String estadoPedido, Integer estado);

    @Query("SELECT COUNT(p) FROM Pedido p")
    long countTotalPedidos();

    @Query("SELECT COALESCE(SUM(p.totalPedido), 0) FROM Pedido p")
    long sumTotalVentas();
}
