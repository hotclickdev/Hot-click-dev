package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Confirmación manual de un SINPE en caja (POS QR). Registro inmutable: Hibernate nunca emite UPDATE
 * ({@link Immutable}, columnas {@code updatable = false}) y en Postgres un trigger rechaza UPDATE/DELETE (V186).
 * La referencia es única por empresa para que un comprobante no se reutilice.
 */
@Entity
@Immutable
@Table(name = "hot_click_pos_sinpe_confirmacion_tb",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_pos_sinpe_conf_empresa_ref", columnNames = {"fk_id_empresa", "referencia"}),
        @UniqueConstraint(name = "uq_pos_sinpe_conf_sesion", columnNames = {"fk_id_qr_sesion"})
    })
public class PosSinpeConfirmacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_confirmacion", updatable = false)
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "fk_id_qr_sesion", nullable = false, updatable = false)
    private Long sesionId;

    @Column(name = "fk_id_pedido", updatable = false)
    private Long pedidoId;

    @Column(name = "referencia", nullable = false, length = 30, updatable = false)
    private String referencia;

    @Column(name = "total", nullable = false, updatable = false)
    private Integer total;

    @Column(name = "fk_id_usuario_genero", updatable = false)
    private Long generadoPorId;

    @Column(name = "fk_id_usuario_confirmo", nullable = false, updatable = false)
    private Long confirmadoPorId;

    @Column(name = "fecha_confirmacion", nullable = false, updatable = false)
    private LocalDateTime fechaConfirmacion = LocalDateTime.now(Constants.ZONA_CR);

    protected PosSinpeConfirmacion() {}

    public PosSinpeConfirmacion(Long empresaId, Long sesionId, Long pedidoId, String referencia, Integer total,
                                Long generadoPorId, Long confirmadoPorId) {
        this.empresaId = empresaId;
        this.sesionId = sesionId;
        this.pedidoId = pedidoId;
        this.referencia = referencia;
        this.total = total;
        this.generadoPorId = generadoPorId;
        this.confirmadoPorId = confirmadoPorId;
    }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public Long getSesionId() { return sesionId; }
    public Long getPedidoId() { return pedidoId; }
    public String getReferencia() { return referencia; }
    public Integer getTotal() { return total; }
    public Long getGeneradoPorId() { return generadoPorId; }
    public Long getConfirmadoPorId() { return confirmadoPorId; }
    public LocalDateTime getFechaConfirmacion() { return fechaConfirmacion; }
}
