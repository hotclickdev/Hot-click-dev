package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Solicitud de bajar de plan con la suscripción ya cobrada: la pyme no baja sola; ADMIN la revisa. */
@Entity
@Table(name = "hot_click_solicitud_cambio_plan_tb")
public class SolicitudCambioPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "plan_actual", nullable = false, length = 40)
    private String planActual;

    @Column(name = "plan_solicitado", nullable = false, length = 40)
    private String planSolicitado;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDateTime fechaSolicitud;

    @Column(name = "solicitado_por")
    private Long solicitadoPor;

    @Column(name = "revisada", nullable = false)
    private boolean revisada;

    @Column(name = "revisada_por")
    private Long revisadaPor;

    @Column(name = "fecha_revision")
    private LocalDateTime fechaRevision;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { this.empresaId = v; }
    public String getPlanActual() { return planActual; }
    public void setPlanActual(String v) { this.planActual = v; }
    public String getPlanSolicitado() { return planSolicitado; }
    public void setPlanSolicitado(String v) { this.planSolicitado = v; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { this.motivo = v; }
    public LocalDateTime getFechaSolicitud() { return fechaSolicitud; }
    public void setFechaSolicitud(LocalDateTime v) { this.fechaSolicitud = v; }
    public Long getSolicitadoPor() { return solicitadoPor; }
    public void setSolicitadoPor(Long v) { this.solicitadoPor = v; }
    public boolean isRevisada() { return revisada; }
    public void setRevisada(boolean v) { this.revisada = v; }
    public Long getRevisadaPor() { return revisadaPor; }
    public void setRevisadaPor(Long v) { this.revisadaPor = v; }
    public LocalDateTime getFechaRevision() { return fechaRevision; }
    public void setFechaRevision(LocalDateTime v) { this.fechaRevision = v; }
}
