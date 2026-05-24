package com.hotclick.repository;

import com.hotclick.model.Testimonio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TestimonioRepository extends JpaRepository<Testimonio, Long> {

    List<Testimonio> findByEstadoOrderByFechaAprobacionDesc(String estado);

    List<Testimonio> findAllByOrderByFechaCreacionDesc();

    List<Testimonio> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId);

    boolean existsByUsuarioIdAndProductoId(Long usuarioId, Long productoId);

    /** Verifica si el usuario compró el producto en un pedido con estado válido */
    @Query("SELECT COUNT(pi) FROM PedidoItem pi " +
           "WHERE pi.producto.id = :productoId " +
           "AND pi.pedido.usuarioFinal.id = :usuarioId " +
           "AND pi.pedido.estadoPedido IN ('PAGADO','EN_PREPARACION','ENVIADO','ENTREGADO','LISTO_RETIRO')")
    Long countCompra(@Param("productoId") Long productoId, @Param("usuarioId") Long usuarioId);
}
