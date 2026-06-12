package com.hotclick.repository;

import com.hotclick.model.Testimonio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TestimonioRepository extends JpaRepository<Testimonio, Long> {

    List<Testimonio> findByEstadoAndTipoOrderByFechaAprobacionDesc(String estado, String tipo);

    List<Testimonio> findAllByOrderByFechaCreacionDesc();

    List<Testimonio> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId);

    /** Cuántas reseñas ha dejado el usuario para ese producto (solo tipo RESENA) */
    long countByUsuarioIdAndProductoIdAndTipo(Long usuarioId, Long productoId, String tipo);

    /** Verifica si el usuario compró el producto en un pedido con estado válido */
    @Query("SELECT COUNT(pi) FROM PedidoItem pi " +
           "WHERE pi.producto.id = :productoId " +
           "AND pi.pedido.usuarioFinal.id = :usuarioId " +
           "AND pi.pedido.estadoPedido IN ('PAGADO','EN_PREPARACION','ENVIADO','ENTREGADO','LISTO_RETIRO')")
    Long countCompra(@Param("productoId") Long productoId, @Param("usuarioId") Long usuarioId);

    @Query("SELECT AVG(t.calificacion) FROM Testimonio t " +
           "WHERE t.producto.id = :productoId AND t.estado = 'APROBADO' AND t.calificacion IS NOT NULL AND t.tipo = 'RESENA'")
    Double avgCalificacion(@Param("productoId") Long productoId);

    @Query("SELECT COUNT(t) FROM Testimonio t " +
           "WHERE t.producto.id = :productoId AND t.estado = 'APROBADO' AND t.calificacion IS NOT NULL AND t.tipo = 'RESENA'")
    Long countAprobadosConCalificacion(@Param("productoId") Long productoId);

    /** Reseñas aprobadas de un producto para mostrar en la página de detalle */
    @Query("SELECT t FROM Testimonio t WHERE t.producto.id = :productoId AND t.estado = 'APROBADO' AND t.tipo = 'RESENA' ORDER BY t.fechaAprobacion DESC")
    List<Testimonio> findResenasByProducto(@Param("productoId") Long productoId);
}
