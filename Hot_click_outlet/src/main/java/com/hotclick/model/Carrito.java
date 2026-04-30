package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_carrito_tb")
public class Carrito extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_carrito")
    private Long id;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @Column(name = "total_carrito")
    private Integer totalCarrito = 0;

    @Column(name = "estado_carrito", length = 20)
    private String estadoCarrito = "ACTIVO";

    @ManyToOne
    @JoinColumn(name = "fk_id_usuario_final", nullable = false)
    private Usuario usuarioFinal;

    @OneToMany(mappedBy = "carrito", cascade = CascadeType.ALL)
    private List<CarritoItem> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }

    public Integer getTotalCarrito() { return totalCarrito; }
    public void setTotalCarrito(Integer totalCarrito) { this.totalCarrito = totalCarrito; }

    public String getEstadoCarrito() { return estadoCarrito; }
    public void setEstadoCarrito(String estadoCarrito) { this.estadoCarrito = estadoCarrito; }

    public Usuario getUsuarioFinal() { return usuarioFinal; }
    public void setUsuarioFinal(Usuario usuarioFinal) { this.usuarioFinal = usuarioFinal; }

    public List<CarritoItem> getItems() { return items; }
    public void setItems(List<CarritoItem> items) { this.items = items; }
}
