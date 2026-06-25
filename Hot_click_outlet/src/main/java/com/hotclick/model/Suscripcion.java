package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_suscripcion_tb")
public class Suscripcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_suscripcion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_plan", nullable = false)
    private Plan plan;

    @Column(name = "stripe_customer_id", length = 100)
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id", length = 100, unique = true)
    private String stripeSubscriptionId;

    @Column(name = "stripe_price_id", length = 100)
    private String stripePriceId;

    /** TRIAL | ACTIVO | CANCELADO | VENCIDO | PAST_DUE */
    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "TRIAL";

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio = LocalDate.now(Constants.ZONA_CR);

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "trial_end")
    private LocalDate trialEnd;

    @Column(name = "cancelar_al_vencer", nullable = false)
    private Boolean cancelarAlVencer = false;

    @Column(name = "fecha_cancelacion")
    private LocalDate fechaCancelacion;

    @Column(name = "motivo_cancelacion")
    private String motivoCancelacion;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);

    public Long getId() { return id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Plan getPlan() { return plan; }
    public void setPlan(Plan plan) { this.plan = plan; }
    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String v) { this.stripeCustomerId = v; }
    public String getStripeSubscriptionId() { return stripeSubscriptionId; }
    public void setStripeSubscriptionId(String v) { this.stripeSubscriptionId = v; }
    public String getStripePriceId() { return stripePriceId; }
    public void setStripePriceId(String v) { this.stripePriceId = v; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate v) { this.fechaInicio = v; }
    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate v) { this.fechaFin = v; }
    public LocalDate getTrialEnd() { return trialEnd; }
    public void setTrialEnd(LocalDate v) { this.trialEnd = v; }
    public Boolean getCancelarAlVencer() { return cancelarAlVencer; }
    public void setCancelarAlVencer(Boolean v) { this.cancelarAlVencer = v; }
    public LocalDate getFechaCancelacion() { return fechaCancelacion; }
    public void setFechaCancelacion(LocalDate v) { this.fechaCancelacion = v; }
    public String getMotivoCancelacion() { return motivoCancelacion; }
    public void setMotivoCancelacion(String v) { this.motivoCancelacion = v; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime v) { this.fechaActualizacion = v; }

    @PreUpdate
    public void preUpdate() { this.fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR); }
}
