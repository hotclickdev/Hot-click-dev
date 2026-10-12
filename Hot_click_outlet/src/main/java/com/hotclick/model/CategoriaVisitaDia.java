package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDate;

/** Contador agregado de visitas por categoría raíz y día. Sin datos personales (V167). */
@Entity
@Table(name = "hot_click_categoria_visita_dia_tb",
    uniqueConstraints = @UniqueConstraint(name = "uq_categoria_visita_dia", columnNames = {"fk_id_categoria", "dia"}))
public class CategoriaVisitaDia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_visita")
    private Long id;

    @Column(name = "fk_id_categoria", nullable = false)
    private Long categoriaId;

    @Column(name = "dia", nullable = false)
    private LocalDate dia;

    @Column(name = "visitas", nullable = false)
    private int visitas;

    protected CategoriaVisitaDia() {}

    public CategoriaVisitaDia(Long categoriaId, LocalDate dia, int visitas) {
        this.categoriaId = categoriaId;
        this.dia = dia;
        this.visitas = visitas;
    }

    public Long getId() { return id; }
    public Long getCategoriaId() { return categoriaId; }
    public LocalDate getDia() { return dia; }
    public int getVisitas() { return visitas; }
}
