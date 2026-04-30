package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_estado_tb")
public class Estado {

    @Id
    @Column(name = "id_estado")
    private Integer idEstado;

    @Column(name = "nombre_estado", nullable = false, length = 20)
    private String nombreEstado;

    @Column(name = "descripcion", length = 100)
    private String descripcion;

    @Column(name = "codigo_color", length = 7)
    private String codigoColor;

    public Integer getIdEstado() { return idEstado; }
    public void setIdEstado(Integer idEstado) { this.idEstado = idEstado; }

    public String getNombreEstado() { return nombreEstado; }
    public void setNombreEstado(String nombreEstado) { this.nombreEstado = nombreEstado; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getCodigoColor() { return codigoColor; }
    public void setCodigoColor(String codigoColor) { this.codigoColor = codigoColor; }
}
