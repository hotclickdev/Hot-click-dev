package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** AG-02: id de mensaje de Meta (wamid o mid) ya tomado para procesar. Dedup persistente, V244. */
@Entity
@Table(name = "hot_click_canal_evento_procesado_tb")
public class CanalEventoProcesado {

    @Id
    @Column(name = "evento_id", nullable = false, length = 200)
    private String eventoId;

    @Column(name = "canal", nullable = false, length = 20)
    private String canal;

    @Column(name = "creado", nullable = false)
    private LocalDateTime creado;

    protected CanalEventoProcesado() {}

    public String getEventoId() { return eventoId; }
    public String getCanal() { return canal; }
    public LocalDateTime getCreado() { return creado; }
}
