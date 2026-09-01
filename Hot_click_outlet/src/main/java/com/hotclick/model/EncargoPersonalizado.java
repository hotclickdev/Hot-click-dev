package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hot_click_encargo_tb")
public class EncargoPersonalizado {

    public static final String ESTADO_PENDIENTE = "PENDIENTE";
    public static final String ESTADO_APROBADO = "APROBADO";
    public static final String ESTADO_RECHAZADO = "RECHAZADO";
    public static final String ESTADO_PAGADO = "PAGADO";
    public static final String ESTADO_VENCIDO = "VENCIDO";
    public static final String ESTADO_PENDIENTE_PAGO = "PENDIENTE_PAGO";

    public static final String MODO_FIJO = "FIJO";
    public static final String MODO_RANGO = "RANGO";
    public static final String MODO_COTIZACION = "COTIZACION";

    public static final int DIAS_VENCIMIENTO_COTIZACION = 7;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_encargo")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto", nullable = false)
    @JsonIgnoreProperties({"adminCliente", "empresa", "bodega", "categoria", "marca"})
    private Producto producto;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario")
    private Usuario usuario;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pedido")
    private Pedido pedido;

    @Column(name = "nombre_cliente", nullable = false, length = 120)
    private String nombreCliente;

    @Column(name = "telefono", length = 30)
    private String telefono;

    @Column(name = "email", nullable = false, length = 200)
    private String email;

    @Column(name = "imagen_url_1", length = 500)
    private String imagenUrl1;

    @Column(name = "imagen_url_2", length = 500)
    private String imagenUrl2;

    @Column(name = "imagen_url_3", length = 500)
    private String imagenUrl3;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "talla_seleccionada", length = 50)
    private String tallaSeleccionada;

    @Column(name = "modo_precio", nullable = false, length = 20)
    private String modoPrecio;

    @Column(name = "precio_cotizado")
    private Integer precioCotizado;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = ESTADO_PENDIENTE;

    @Column(name = "motivo_rechazo", columnDefinition = "TEXT")
    private String motivoRechazo;

    @Column(name = "token_publico", nullable = false, length = 36)
    private String tokenPublico;

    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @Transient
    private String productoNombre;

    @Transient
    private Long productoId;

    @Transient
    private Long empresaId;

    @Transient
    private Long pedidoId;

    @PrePersist
    void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);
        }
        if (tokenPublico == null) {
            tokenPublico = UUID.randomUUID().toString();
        }
        fechaActualizacion = fechaCreacion;
    }

    @PreUpdate
    void onUpdate() {
        fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getImagenUrl1() { return imagenUrl1; }
    public void setImagenUrl1(String imagenUrl1) { this.imagenUrl1 = imagenUrl1; }

    public String getImagenUrl2() { return imagenUrl2; }
    public void setImagenUrl2(String imagenUrl2) { this.imagenUrl2 = imagenUrl2; }

    public String getImagenUrl3() { return imagenUrl3; }
    public void setImagenUrl3(String imagenUrl3) { this.imagenUrl3 = imagenUrl3; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getTallaSeleccionada() { return tallaSeleccionada; }
    public void setTallaSeleccionada(String tallaSeleccionada) { this.tallaSeleccionada = tallaSeleccionada; }

    public String getModoPrecio() { return modoPrecio; }
    public void setModoPrecio(String modoPrecio) { this.modoPrecio = modoPrecio; }

    public Integer getPrecioCotizado() { return precioCotizado; }
    public void setPrecioCotizado(Integer precioCotizado) { this.precioCotizado = precioCotizado; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getMotivoRechazo() { return motivoRechazo; }
    public void setMotivoRechazo(String motivoRechazo) { this.motivoRechazo = motivoRechazo; }

    public String getTokenPublico() { return tokenPublico; }
    public void setTokenPublico(String tokenPublico) { this.tokenPublico = tokenPublico; }

    public LocalDateTime getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDateTime fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }

    public String getProductoNombre() {
        if (productoNombre != null) return productoNombre;
        return producto != null ? producto.getNombreProducto() : null;
    }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }

    public Long getProductoId() {
        if (productoId != null) return productoId;
        return producto != null ? producto.getId() : null;
    }
    public void setProductoId(Long productoId) { this.productoId = productoId; }

    public Long getEmpresaId() {
        if (empresaId != null) return empresaId;
        return empresa != null ? empresa.getId() : null;
    }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }

    public Long getPedidoId() {
        if (pedidoId != null) return pedidoId;
        return pedido != null ? pedido.getId() : null;
    }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
}
