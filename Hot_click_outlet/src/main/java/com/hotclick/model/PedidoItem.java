package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_pedido_item_tb")
public class PedidoItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido_item")
    private Long id;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario_momento", nullable = false)
    private Integer precioUnitarioMomento;

    @Column(name = "costo_unitario_momento", nullable = false)
    private Integer costoUnitarioMomento;

    @Column(name = "descuento_aplicado")
    private Integer descuentoAplicado = 0;

    @Column(name = "subtotal_item", nullable = false)
    private Integer subtotalItem;

    @Column(name = "utilidad_item", nullable = false)
    private Integer utilidadItem;

    @ManyToOne
    @JoinColumn(name = "fk_id_pedido", nullable = false)
    private Pedido pedido;

    @ManyToOne
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public Integer getPrecioUnitarioMomento() { return precioUnitarioMomento; }
    public void setPrecioUnitarioMomento(Integer precioUnitarioMomento) { this.precioUnitarioMomento = precioUnitarioMomento; }

    public Integer getCostoUnitarioMomento() { return costoUnitarioMomento; }
    public void setCostoUnitarioMomento(Integer costoUnitarioMomento) { this.costoUnitarioMomento = costoUnitarioMomento; }

    public Integer getDescuentoAplicado() { return descuentoAplicado; }
    public void setDescuentoAplicado(Integer descuentoAplicado) { this.descuentoAplicado = descuentoAplicado; }

    public Integer getSubtotalItem() { return subtotalItem; }
    public void setSubtotalItem(Integer subtotalItem) { this.subtotalItem = subtotalItem; }

    public Integer getUtilidadItem() { return utilidadItem; }
    public void setUtilidadItem(Integer utilidadItem) { this.utilidadItem = utilidadItem; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
}
