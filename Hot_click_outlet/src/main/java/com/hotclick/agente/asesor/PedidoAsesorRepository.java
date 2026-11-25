package com.hotclick.agente.asesor;

import com.hotclick.model.Pedido;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Lectura de pedidos para el asesor web. Solo consultas acotadas; nunca devuelve listas sin tope. */
public interface PedidoAsesorRepository extends Repository<Pedido, Long> {

    @Query("SELECT p FROM Pedido p LEFT JOIN FETCH p.usuarioFinal WHERE p.numeroPedido = :numero")
    Optional<Pedido> porNumero(@Param("numero") String numero);

    @Query("SELECT p FROM Pedido p LEFT JOIN FETCH p.usuarioFinal WHERE p.usuarioFinal.id = :usuarioId "
         + "ORDER BY p.fechaPedido DESC")
    List<Pedido> delUsuario(@Param("usuarioId") Long usuarioId, Pageable pageable);
}
