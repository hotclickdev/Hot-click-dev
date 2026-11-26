package com.hotclick.agente.ventas;

import com.hotclick.model.Pedido;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/** Lectura de pedidos para el bot de ventas. Siempre acotada a una empresa. */
public interface PedidoVentasRepository extends Repository<Pedido, Long> {

    /** Pedidos recientes de UNA empresa con el comprador precargado (sin items: no se paginan en memoria). */
    @Query("SELECT p FROM Pedido p LEFT JOIN FETCH p.usuarioFinal "
         + "WHERE p.empresa.id = :empresaId ORDER BY p.fechaPedido DESC")
    List<Pedido> recientesDeEmpresa(@Param("empresaId") Long empresaId, Pageable pageable);
}
