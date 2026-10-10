package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Interés de un cliente en que le avisen cuando un producto agotado vuelva
 * a tener stock ("Avisame cuando vuelva", ficha de producto agotado en Figma).
 * Al reponer stock, {@code AvisoReposicionService} envía un correo por suscripción
 * pendiente y la marca (notificado + fecha_notificacion).
 */
@Entity
@Table(name = "hot_click_suscripcion_reposicion_tb")
public class SuscripcionReposicion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_suscripcion_reposicion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario")
    private Usuario usuario;

    @Column(name = "correo", nullable = false, length = 160)
    private String correo;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "notificado", nullable = false)
    private boolean notificado = false;

    @Column(name = "fecha_notificacion")
    private LocalDateTime fechaNotificacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public boolean isNotificado() { return notificado; }
    public void setNotificado(boolean notificado) { this.notificado = notificado; }

    public LocalDateTime getFechaNotificacion() { return fechaNotificacion; }
    public void setFechaNotificacion(LocalDateTime fechaNotificacion) { this.fechaNotificacion = fechaNotificacion; }
}
