package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_encargo_evento_tb")
public class EncargoEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_evento")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_encargo", nullable = false)
    private EncargoPersonalizado encargo;

    @Column(name = "tipo_evento", nullable = false, length = 40)
    private String tipoEvento;

    @Column(name = "estado_anterior", length = 20)
    private String estadoAnterior;

    @Column(name = "estado_nuevo", length = 20)
    private String estadoNuevo;

    @Column(name = "detalle", columnDefinition = "TEXT")
    private String detalle;

    @Column(name = "fecha_evento", nullable = false)
    private LocalDateTime fechaEvento;

    @PrePersist
    void onCreate() {
        if (fechaEvento == null) {
            fechaEvento = LocalDateTime.now(Constants.ZONA_CR);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public EncargoPersonalizado getEncargo() { return encargo; }
    public void setEncargo(EncargoPersonalizado encargo) { this.encargo = encargo; }

    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }

    public String getEstadoAnterior() { return estadoAnterior; }
    public void setEstadoAnterior(String estadoAnterior) { this.estadoAnterior = estadoAnterior; }

    public String getEstadoNuevo() { return estadoNuevo; }
    public void setEstadoNuevo(String estadoNuevo) { this.estadoNuevo = estadoNuevo; }

    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }

    public LocalDateTime getFechaEvento() { return fechaEvento; }
    public void setFechaEvento(LocalDateTime fechaEvento) { this.fechaEvento = fechaEvento; }
}
