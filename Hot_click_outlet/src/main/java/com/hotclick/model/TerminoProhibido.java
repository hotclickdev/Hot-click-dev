package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** QA-NEG-038: término que no se puede publicar (nombre, descripción o categoría del producto). Lo edita el ADMIN. */
@Entity
@Table(name = "hot_click_termino_prohibido_tb")
public class TerminoProhibido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_termino")
    private Long id;

    /** Normalizado: minúsculas, sin tildes. */
    @Column(name = "termino", nullable = false, unique = true, length = 80)
    private String termino;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public String getTermino() { return termino; }
    public void setTermino(String termino) { this.termino = termino; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
