package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Intento de cobro de mensualidad con la pasarela (tabla de V170). */
@Entity
@Table(name = "hot_click_cobro_suscripcion_tb")
public class CobroSuscripcion {

    public static final String PENDIENTE = "PENDIENTE";
    public static final String PAGADO = "PAGADO";
    public static final String FALLIDO = "FALLIDO";
    public static final String ANULADO = "ANULADO";
    public static final String MOTIVO_ALTA = "ALTA";
    public static final String MOTIVO_RENOVACION = "RENOVACION";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cobro_suscripcion")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "fk_id_plan", nullable = false)
    private Long planId;

    @Column(name = "order_number", nullable = false, unique = true, length = 60)
    private String orderNumber;

    @Column(name = "monto_crc", nullable = false)
    private Long montoCrc;

    @Column(name = "estado", nullable = false, length = 12)
    private String estado = PENDIENTE;

    @Column(name = "motivo", nullable = false, length = 12)
    private String motivo = MOTIVO_ALTA;

    @Column(name = "autorizacion", length = 60)
    private String autorizacion;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { this.empresaId = v; }
    public Long getPlanId() { return planId; }
    public void setPlanId(Long v) { this.planId = v; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String v) { this.orderNumber = v; }
    public Long getMontoCrc() { return montoCrc; }
    public void setMontoCrc(Long v) { this.montoCrc = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { this.motivo = v; }
    public String getAutorizacion() { return autorizacion; }
    public void setAutorizacion(String v) { this.autorizacion = v; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDateTime v) { this.fechaPago = v; }
}
