package com.hotclick.model;

import jakarta.persistence.*;

@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "fk_id_estado", nullable = false)
    private Integer estado = 1;

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }
}
