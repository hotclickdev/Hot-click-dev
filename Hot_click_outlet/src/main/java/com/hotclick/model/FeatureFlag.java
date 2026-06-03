package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_feature_flag_tb")
public class FeatureFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_flag")
    private Long id;

    @Column(name = "nombre", nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "activo_defecto", nullable = false)
    private Boolean activoDefecto = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Boolean getActivoDefecto() { return activoDefecto; }
    public void setActivoDefecto(Boolean activoDefecto) { this.activoDefecto = activoDefecto; }
}
