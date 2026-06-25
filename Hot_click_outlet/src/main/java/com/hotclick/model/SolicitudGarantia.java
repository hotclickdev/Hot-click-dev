package com.hotclick.model;
import com.hotclick.utils.Constants;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_solicitud_garantia_tb")
public class SolicitudGarantia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud_garantia")
    private Long id;

    @JsonIgnoreProperties({"contrasenaHash", "roles", "pedidos", "carritos"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pedido")
    private Pedido pedido;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = "PENDIENTE";

    @Column(name = "notas_admin", columnDefinition = "TEXT")
    private String notasAdmin;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "estado_registro", nullable = false)
    private Integer estadoRegistro = 1;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getNotasAdmin() { return notasAdmin; }
    public void setNotasAdmin(String notasAdmin) { this.notasAdmin = notasAdmin; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public Integer getEstadoRegistro() { return estadoRegistro; }
    public void setEstadoRegistro(Integer estadoRegistro) { this.estadoRegistro = estadoRegistro; }

    /* ── Computed fields for JSON ── */
    public Long getProductoId() { return producto != null ? producto.getId() : null; }
    public String getProductoNombre() { return producto != null ? producto.getNombreProducto() : null; }
    public String getProductoImagenUrl() { return producto != null ? producto.getImagenPrincipalUrl() : null; }
    public Long getPedidoId() { return pedido != null ? pedido.getId() : null; }
    public String getNumeroPedido() { return pedido != null ? pedido.getNumeroPedido() : null; }
    public String getUsuarioNombre() { return usuario != null ? usuario.getNombre() : null; }
    public String getUsuarioCorreo() { return usuario != null ? usuario.getCorreo() : null; }
}
