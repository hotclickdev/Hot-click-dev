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

/** Invitación pendiente al equipo de un negocio. Solo se guarda el SHA-256 del token (nunca el token). */
@Entity
@Table(name = "hot_click_invitacion_equipo_tb")
public class InvitacionEquipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_invitacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "correo", nullable = false, length = 150)
    private String correo;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "telefono", length = 30)
    private String telefono;

    @Column(name = "rol_en_empresa", nullable = false, length = 30)
    private String rolEnEmpresa;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "vence_en", nullable = false)
    private LocalDateTime venceEn;

    /** Solo lo escribe {@code InvitacionEquipoRepository.consumir} (UPDATE condicional atómico). */
    @Column(name = "usado_en", insertable = false, updatable = false)
    private LocalDateTime usadoEn;

    @Column(name = "revocado_en", insertable = false, updatable = false)
    private LocalDateTime revocadoEn;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fk_id_usuario_invita")
    private Long usuarioInvitaId;

    public Long getId() { return id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getRolEnEmpresa() { return rolEnEmpresa; }
    public void setRolEnEmpresa(String rolEnEmpresa) { this.rolEnEmpresa = rolEnEmpresa; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public LocalDateTime getVenceEn() { return venceEn; }
    public void setVenceEn(LocalDateTime venceEn) { this.venceEn = venceEn; }
    public LocalDateTime getUsadoEn() { return usadoEn; }
    public LocalDateTime getRevocadoEn() { return revocadoEn; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public Long getUsuarioInvitaId() { return usuarioInvitaId; }
    public void setUsuarioInvitaId(Long usuarioInvitaId) { this.usuarioInvitaId = usuarioInvitaId; }
}
