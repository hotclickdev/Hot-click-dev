package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_tienda_rapida_tb")
public class TiendaRapida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tienda_rapida")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "persona", nullable = false, length = 80)
    private String persona;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "dias", nullable = false)
    private Integer dias;

    @Column(name = "vence", nullable = false)
    private LocalDateTime vence;

    /** Solo enlaces de V157 (anteriores a V158). Los nuevos guardan únicamente {@link #tokenHash}. */
    @Column(name = "token", length = 64)
    private String token;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @Column(name = "creada", nullable = false)
    private LocalDateTime creada;

    @Column(name = "token_hash", length = 64, unique = true)
    private String tokenHash;

    @Column(name = "enlace_vence")
    private LocalDateTime enlaceVence;

    @Column(name = "usado_en")
    private LocalDateTime usadoEn;

    @Column(name = "revocado_en")
    private LocalDateTime revocadoEn;

    @Column(name = "creado_por")
    private Long creadoPor;

    @Column(name = "aceptado_en")
    private LocalDateTime aceptadoEn;

    @Column(name = "aceptado_ip_hash", length = 64)
    private String aceptadoIpHash;

    @Column(name = "aceptado_por")
    private Long aceptadoPor;

    @Column(name = "version_legal", length = 20)
    private String versionLegal;

    @Column(name = "onboarding_hechos", length = 120)
    private String onboardingHechos;

    public Long getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public LocalDateTime getEnlaceVence() { return enlaceVence; }
    public void setEnlaceVence(LocalDateTime enlaceVence) { this.enlaceVence = enlaceVence; }
    public LocalDateTime getUsadoEn() { return usadoEn; }
    public void setUsadoEn(LocalDateTime usadoEn) { this.usadoEn = usadoEn; }
    public LocalDateTime getRevocadoEn() { return revocadoEn; }
    public void setRevocadoEn(LocalDateTime revocadoEn) { this.revocadoEn = revocadoEn; }
    public Long getCreadoPor() { return creadoPor; }
    public void setCreadoPor(Long creadoPor) { this.creadoPor = creadoPor; }
    public LocalDateTime getAceptadoEn() { return aceptadoEn; }
    public void setAceptadoEn(LocalDateTime aceptadoEn) { this.aceptadoEn = aceptadoEn; }
    public String getAceptadoIpHash() { return aceptadoIpHash; }
    public void setAceptadoIpHash(String aceptadoIpHash) { this.aceptadoIpHash = aceptadoIpHash; }
    public Long getAceptadoPor() { return aceptadoPor; }
    public void setAceptadoPor(Long aceptadoPor) { this.aceptadoPor = aceptadoPor; }
    public String getVersionLegal() { return versionLegal; }
    public void setVersionLegal(String versionLegal) { this.versionLegal = versionLegal; }
    public String getOnboardingHechos() { return onboardingHechos; }
    public void setOnboardingHechos(String onboardingHechos) { this.onboardingHechos = onboardingHechos; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getPersona() { return persona; }
    public void setPersona(String persona) { this.persona = persona; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public Integer getDias() { return dias; }
    public void setDias(Integer dias) { this.dias = dias; }
    public LocalDateTime getVence() { return vence; }
    public void setVence(LocalDateTime vence) { this.vence = vence; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getCreada() { return creada; }
    public void setCreada(LocalDateTime creada) { this.creada = creada; }
}
