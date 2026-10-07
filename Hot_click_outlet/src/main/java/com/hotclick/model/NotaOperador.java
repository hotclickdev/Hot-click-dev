package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_nota_operador_tb")
public class NotaOperador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_nota")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "nota", nullable = false, length = 1000)
    private String nota;

    @Column(name = "proxima_accion", length = 300)
    private String proximaAccion;

    @Column(name = "bandeja", length = 40)
    private String bandeja;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "admin_email", length = 200)
    private String adminEmail;

    @Column(name = "creada", nullable = false)
    private LocalDateTime creada;

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
    public String getProximaAccion() { return proximaAccion; }
    public void setProximaAccion(String proximaAccion) { this.proximaAccion = proximaAccion; }
    public String getBandeja() { return bandeja; }
    public void setBandeja(String bandeja) { this.bandeja = bandeja; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public LocalDateTime getCreada() { return creada; }
    public void setCreada(LocalDateTime creada) { this.creada = creada; }
}
