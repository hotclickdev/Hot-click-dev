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

    @Column(name = "token", nullable = false, length = 64)
    private String token;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @Column(name = "creada", nullable = false)
    private LocalDateTime creada;

    public Long getId() { return id; }
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
