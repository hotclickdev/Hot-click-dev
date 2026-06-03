package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_permiso_tb")
public class Permiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_permiso")
    private Integer id;

    @Column(name = "nombre_permiso", nullable = false, unique = true, length = 50)
    private String nombrePermiso;

    @Column(name = "descripcion", length = 200)
    private String descripcion;

    @Column(name = "modulo", nullable = false, length = 30)
    private String modulo;

    @Column(name = "fk_id_estado", nullable = false)
    private Integer estado = 1;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getNombrePermiso() { return nombrePermiso; }
    public void setNombrePermiso(String nombrePermiso) { this.nombrePermiso = nombrePermiso; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }
}
