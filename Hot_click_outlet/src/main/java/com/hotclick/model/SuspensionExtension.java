package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Extensión de admin "Dar 3 días extra" sobre una suspensión por impago. Una por ciclo (suscripción VENCIDA). */
@Entity
@Table(name = "hot_click_suspension_extension_tb")
public class SuspensionExtension {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_extension")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "suscripcion_id", nullable = false, unique = true)
    private Long suscripcionId;

    @Column(name = "gracia_desde", nullable = false)
    private LocalDateTime graciaDesde;

    @Column(name = "gracia_hasta", nullable = false)
    private LocalDateTime graciaHasta;

    @Column(name = "otorgada_en", nullable = false)
    private LocalDateTime otorgadaEn;

    @Column(name = "vence_en", nullable = false)
    private LocalDateTime venceEn;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "admin_email", length = 150)
    private String adminEmail;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public Long getSuscripcionId() { return suscripcionId; }
    public void setSuscripcionId(Long suscripcionId) { this.suscripcionId = suscripcionId; }
    public LocalDateTime getGraciaDesde() { return graciaDesde; }
    public void setGraciaDesde(LocalDateTime graciaDesde) { this.graciaDesde = graciaDesde; }
    public LocalDateTime getGraciaHasta() { return graciaHasta; }
    public void setGraciaHasta(LocalDateTime graciaHasta) { this.graciaHasta = graciaHasta; }
    public LocalDateTime getOtorgadaEn() { return otorgadaEn; }
    public void setOtorgadaEn(LocalDateTime otorgadaEn) { this.otorgadaEn = otorgadaEn; }
    public LocalDateTime getVenceEn() { return venceEn; }
    public void setVenceEn(LocalDateTime venceEn) { this.venceEn = venceEn; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
}
