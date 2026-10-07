package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_sancion_plataforma_tb")
public class SancionPlataforma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sancion")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "nivel_solicitado", nullable = false, length = 20)
    private String nivelSolicitado;

    @Column(name = "nivel_aplicado", nullable = false, length = 20)
    private String nivelAplicado;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    @Column(name = "politica", length = 80)
    private String politica;

    @Column(name = "inicio", nullable = false)
    private LocalDateTime inicio;

    @Column(name = "fin")
    private LocalDateTime fin;

    @Column(name = "activa", nullable = false)
    private boolean activa = true;

    @Column(name = "restituir_visibilidad", nullable = false)
    private boolean restituirVisibilidad;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "admin_email", length = 200)
    private String adminEmail;

    @Column(name = "creada", nullable = false)
    private LocalDateTime creada;

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getNivelSolicitado() { return nivelSolicitado; }
    public void setNivelSolicitado(String nivelSolicitado) { this.nivelSolicitado = nivelSolicitado; }
    public String getNivelAplicado() { return nivelAplicado; }
    public void setNivelAplicado(String nivelAplicado) { this.nivelAplicado = nivelAplicado; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getPolitica() { return politica; }
    public void setPolitica(String politica) { this.politica = politica; }
    public LocalDateTime getInicio() { return inicio; }
    public void setInicio(LocalDateTime inicio) { this.inicio = inicio; }
    public LocalDateTime getFin() { return fin; }
    public void setFin(LocalDateTime fin) { this.fin = fin; }
    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }
    public boolean isRestituirVisibilidad() { return restituirVisibilidad; }
    public void setRestituirVisibilidad(boolean restituirVisibilidad) { this.restituirVisibilidad = restituirVisibilidad; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public LocalDateTime getCreada() { return creada; }
    public void setCreada(LocalDateTime creada) { this.creada = creada; }
}
