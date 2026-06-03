package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_ai_mensaje_tb")
public class AiMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ai_mensaje_seq")
    @SequenceGenerator(name = "ai_mensaje_seq", sequenceName = "hot_click_ai_mensaje_seq", allocationSize = 50)
    @Column(name = "id_mensaje")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    /** user | assistant */
    @Column(name = "rol", nullable = false, length = 20)
    private String rol;

    @Column(name = "contenido", nullable = false, columnDefinition = "text")
    private String contenido;

    @Column(name = "tokens")
    private Integer tokens = 0;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @PrePersist
    void onCreate() { fechaCreacion = LocalDateTime.now(); }

    public Long getId() { return id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }

    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }

    public Integer getTokens() { return tokens; }
    public void setTokens(Integer tokens) { this.tokens = tokens; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
