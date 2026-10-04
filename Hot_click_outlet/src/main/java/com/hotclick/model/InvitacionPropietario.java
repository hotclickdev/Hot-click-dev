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
@Table(name = "hot_click_invitacion_propietario_tb")
public class InvitacionPropietario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_invitacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    /** SHA-256 hex del token. El valor en claro solo viaja en el enlace. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "correo_destino", length = 200)
    private String correoDestino;

    @Column(name = "telefono_destino", length = 30)
    private String telefonoDestino;

    @Column(name = "fk_id_creada_por")
    private Long creadaPorId;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(name = "usada_en")
    private LocalDateTime usadaEn;

    @Column(name = "fk_id_usada_por")
    private Long usadaPorId;

    @Column(name = "revocada_en")
    private LocalDateTime revocadaEn;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public String getCorreoDestino() { return correoDestino; }
    public void setCorreoDestino(String correoDestino) { this.correoDestino = correoDestino; }

    public String getTelefonoDestino() { return telefonoDestino; }
    public void setTelefonoDestino(String telefonoDestino) { this.telefonoDestino = telefonoDestino; }

    public Long getCreadaPorId() { return creadaPorId; }
    public void setCreadaPorId(Long creadaPorId) { this.creadaPorId = creadaPorId; }

    public LocalDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(LocalDateTime expiraEn) { this.expiraEn = expiraEn; }

    public LocalDateTime getUsadaEn() { return usadaEn; }
    public void setUsadaEn(LocalDateTime usadaEn) { this.usadaEn = usadaEn; }

    public Long getUsadaPorId() { return usadaPorId; }
    public void setUsadaPorId(Long usadaPorId) { this.usadaPorId = usadaPorId; }

    public LocalDateTime getRevocadaEn() { return revocadaEn; }
    public void setRevocadaEn(LocalDateTime revocadaEn) { this.revocadaEn = revocadaEn; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
