package com.hotclick.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_pedido_tb")
public class Pedido extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido")
    private Long id;

    @Column(name = "numero_pedido", unique = true, nullable = false, length = 20)
    private String numeroPedido;

    @Column(name = "fecha_pedido")
    private LocalDateTime fechaPedido;

    @Column(name = "fecha_entrega_estimada")
    private LocalDate fechaEntregaEstimada;

    @Column(name = "fecha_entrega_real")
    private LocalDate fechaEntregaReal;

    @Column(name = "subtotal", nullable = false)
    private Integer subtotal;

    @Column(name = "descuento_total")
    private Integer descuentoTotal = 0;

    @Column(name = "aplica_impuesto")
    private Boolean aplicaImpuesto = false;

    @Column(name = "monto_impuesto")
    private Integer montoImpuesto = 0;

    @Column(name = "total_pedido", nullable = false)
    private Integer totalPedido;

    @Column(name = "costo_envio")
    private Integer costoEnvio = 0;

    @Column(name = "costo_total_productos", nullable = false)
    private Integer costoTotalProductos;

    @Column(name = "utilidad_bruta", nullable = false)
    private Integer utilidadBruta;

    @Column(name = "margen_ganancia_pedido", precision = 8, scale = 2)
    private BigDecimal margenGananciaPedido;

    @Column(name = "estado_pedido", length = 20)
    private String estadoPedido = "PENDIENTE";

    @Column(name = "metodo_pago", nullable = false, length = 30)
    private String metodoPago;

    @Column(name = "metodo_envio", nullable = false, length = 30)
    private String metodoEnvio;

    @Column(name = "notas")
    private String notas;

    @Column(name = "factura_generada")
    private Boolean facturaGenerada = false;

    @Column(name = "factura_enviada_whatsapp")
    private Boolean facturaEnviadaWhatsapp = false;

    @ManyToOne
    @JoinColumn(name = "fk_id_usuario_final", nullable = false)
    private Usuario usuarioFinal;

    @ManyToOne
    @JoinColumn(name = "fk_id_bodega", nullable = false)
    private Bodega bodega;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL)
    private List<PedidoItem> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroPedido() { return numeroPedido; }
    public void setNumeroPedido(String numeroPedido) { this.numeroPedido = numeroPedido; }

    public LocalDateTime getFechaPedido() { return fechaPedido; }
    public void setFechaPedido(LocalDateTime fechaPedido) { this.fechaPedido = fechaPedido; }

    public LocalDate getFechaEntregaEstimada() { return fechaEntregaEstimada; }
    public void setFechaEntregaEstimada(LocalDate fechaEntregaEstimada) { this.fechaEntregaEstimada = fechaEntregaEstimada; }

    public LocalDate getFechaEntregaReal() { return fechaEntregaReal; }
    public void setFechaEntregaReal(LocalDate fechaEntregaReal) { this.fechaEntregaReal = fechaEntregaReal; }

    public Integer getSubtotal() { return subtotal; }
    public void setSubtotal(Integer subtotal) { this.subtotal = subtotal; }

    public Integer getDescuentoTotal() { return descuentoTotal; }
    public void setDescuentoTotal(Integer descuentoTotal) { this.descuentoTotal = descuentoTotal; }

    public Boolean getAplicaImpuesto() { return aplicaImpuesto; }
    public void setAplicaImpuesto(Boolean aplicaImpuesto) { this.aplicaImpuesto = aplicaImpuesto; }

    public Integer getMontoImpuesto() { return montoImpuesto; }
    public void setMontoImpuesto(Integer montoImpuesto) { this.montoImpuesto = montoImpuesto; }

    public Integer getTotalPedido() { return totalPedido; }
    public void setTotalPedido(Integer totalPedido) { this.totalPedido = totalPedido; }

    public Integer getCostoEnvio() { return costoEnvio; }
    public void setCostoEnvio(Integer costoEnvio) { this.costoEnvio = costoEnvio; }

    public Integer getCostoTotalProductos() { return costoTotalProductos; }
    public void setCostoTotalProductos(Integer costoTotalProductos) { this.costoTotalProductos = costoTotalProductos; }

    public Integer getUtilidadBruta() { return utilidadBruta; }
    public void setUtilidadBruta(Integer utilidadBruta) { this.utilidadBruta = utilidadBruta; }

    public BigDecimal getMargenGananciaPedido() { return margenGananciaPedido; }
    public void setMargenGananciaPedido(BigDecimal margenGananciaPedido) { this.margenGananciaPedido = margenGananciaPedido; }

    public String getEstadoPedido() { return estadoPedido; }
    public void setEstadoPedido(String estadoPedido) { this.estadoPedido = estadoPedido; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getMetodoEnvio() { return metodoEnvio; }
    public void setMetodoEnvio(String metodoEnvio) { this.metodoEnvio = metodoEnvio; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public Boolean getFacturaGenerada() { return facturaGenerada; }
    public void setFacturaGenerada(Boolean facturaGenerada) { this.facturaGenerada = facturaGenerada; }

    public Boolean getFacturaEnviadaWhatsapp() { return facturaEnviadaWhatsapp; }
    public void setFacturaEnviadaWhatsapp(Boolean facturaEnviadaWhatsapp) { this.facturaEnviadaWhatsapp = facturaEnviadaWhatsapp; }

    public Usuario getUsuarioFinal() { return usuarioFinal; }
    public void setUsuarioFinal(Usuario usuarioFinal) { this.usuarioFinal = usuarioFinal; }

    public Bodega getBodega() { return bodega; }
    public void setBodega(Bodega bodega) { this.bodega = bodega; }

    public List<PedidoItem> getItems() { return items; }
    public void setItems(List<PedidoItem> items) { this.items = items; }
}
