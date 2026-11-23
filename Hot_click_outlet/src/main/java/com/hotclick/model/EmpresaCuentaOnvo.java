package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Cuenta conectada ONVO (marketplace) de una empresa. Solo {@link #ACTIVA} habilita onBehalfOf. */
@Entity
@org.hibernate.annotations.DynamicUpdate
@Table(name = "hot_click_empresa_cuenta_onvo_tb")
public class EmpresaCuentaOnvo {

    public static final String PENDIENTE_ONVO = "PENDIENTE_ONVO";
    public static final String PENDIENTE_ONBOARDING = "PENDIENTE_ONBOARDING";
    public static final String EN_APROBACION = "EN_APROBACION";
    public static final String ACTIVA = "ACTIVA";
    public static final String INACTIVA = "INACTIVA";
    public static final String SUSPENDIDA = "SUSPENDIDA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cuenta_onvo")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false, unique = true)
    private Long empresaId;

    @Column(name = "onvo_account_id", length = 100, unique = true)
    private String onvoAccountId;

    @Column(name = "onvo_status", length = 40)
    private String onvoStatus;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = PENDIENTE_ONVO;

    @Column(name = "onboarding_url", length = 1000)
    private String onboardingUrl;

    @Column(name = "onboarding_expira_en")
    private LocalDateTime onboardingExpiraEn;

    @Column(name = "intentos", nullable = false)
    private int intentos;

    @Column(name = "ultimo_error", length = 300)
    private String ultimoError;

    @Column(name = "ultima_consulta_en")
    private LocalDateTime ultimaConsultaEn;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    /** V244: primera vez que ONVO la confirmó ACTIVA (NULL = nunca). */
    @Column(name = "activada_en")
    private LocalDateTime activadaEn;

    /** V244: claim del aviso único «listo para revisión HotClick» al admin (NULL = aún no avisado). */
    @Column(name = "revision_aviso_en")
    private LocalDateTime revisionAvisoEn;

    /** V244: desde cuándo la cuenta dejó de estar ACTIVA habiendo estado activa (NULL = no está perdida). */
    @Column(name = "perdida_desde")
    private LocalDateTime perdidaDesde;

    /** V244: avisos de pérdida ya enviados (el primero + recordatorios). */
    @Column(name = "avisos_perdida", nullable = false)
    private int avisosPerdida;

    @Column(name = "ultimo_aviso_perdida_en")
    private LocalDateTime ultimoAvisoPerdidaEn;

    /** V244: la cuenta volvió a ACTIVA tras una pérdida y falta avisar «cobros reanudados» (una sola vez). */
    @Column(name = "recuperada_aviso_pendiente", nullable = false)
    private boolean recuperadaAvisoPendiente;

    @PreUpdate
    void alActualizar() { actualizadoEn = LocalDateTime.now(); }

    public boolean isActiva() { return ACTIVA.equals(estado) && onvoAccountId != null && !onvoAccountId.isBlank(); }

    public LocalDateTime getActivadaEn() { return activadaEn; }
    public void setActivadaEn(LocalDateTime v) { this.activadaEn = v; }
    public LocalDateTime getRevisionAvisoEn() { return revisionAvisoEn; }
    public void setRevisionAvisoEn(LocalDateTime v) { this.revisionAvisoEn = v; }
    public LocalDateTime getPerdidaDesde() { return perdidaDesde; }
    public void setPerdidaDesde(LocalDateTime v) { this.perdidaDesde = v; }
    public int getAvisosPerdida() { return avisosPerdida; }
    public void setAvisosPerdida(int v) { this.avisosPerdida = v; }
    public LocalDateTime getUltimoAvisoPerdidaEn() { return ultimoAvisoPerdidaEn; }
    public void setUltimoAvisoPerdidaEn(LocalDateTime v) { this.ultimoAvisoPerdidaEn = v; }
    public boolean isRecuperadaAvisoPendiente() { return recuperadaAvisoPendiente; }
    public void setRecuperadaAvisoPendiente(boolean v) { this.recuperadaAvisoPendiente = v; }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getOnvoAccountId() { return onvoAccountId; }
    public void setOnvoAccountId(String onvoAccountId) { this.onvoAccountId = onvoAccountId; }
    public String getOnvoStatus() { return onvoStatus; }
    public void setOnvoStatus(String onvoStatus) { this.onvoStatus = onvoStatus; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getOnboardingUrl() { return onboardingUrl; }
    public void setOnboardingUrl(String onboardingUrl) { this.onboardingUrl = onboardingUrl; }
    public LocalDateTime getOnboardingExpiraEn() { return onboardingExpiraEn; }
    public void setOnboardingExpiraEn(LocalDateTime v) { this.onboardingExpiraEn = v; }
    public int getIntentos() { return intentos; }
    public void setIntentos(int intentos) { this.intentos = intentos; }
    public String getUltimoError() { return ultimoError; }
    public void setUltimoError(String ultimoError) { this.ultimoError = ultimoError; }
    public LocalDateTime getUltimaConsultaEn() { return ultimaConsultaEn; }
    public void setUltimaConsultaEn(LocalDateTime v) { this.ultimaConsultaEn = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
}
