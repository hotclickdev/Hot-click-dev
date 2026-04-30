package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_rol_tb")
public class Rol extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol")
    private Long id;

    @Column(name = "nombre_rol", nullable = false, unique = true, length = 30)
    private String nombreRol;

    @Column(name = "descripcion", length = 200)
    private String descripcion;

    @Column(name = "nivel_acceso", nullable = false)
    private Integer nivelAcceso = 1;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreRol() { return nombreRol; }
    public void setNombreRol(String nombreRol) { this.nombreRol = nombreRol; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Integer getNivelAcceso() { return nivelAcceso; }
    public void setNivelAcceso(Integer nivelAcceso) { this.nivelAcceso = nivelAcceso; }
}
