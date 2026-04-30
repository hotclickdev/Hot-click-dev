package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_carrito_item_tb")
public class CarritoItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_carrito_item")
    private Long id;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad = 1;

    @Column(name = "precio_unitario_momento", nullable = false)
    private Integer precioUnitarioMomento;

    @ManyToOne
    @JoinColumn(name = "fk_id_carrito", nullable = false)
    private Carrito carrito;

    @ManyToOne
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public Integer getPrecioUnitarioMomento() { return precioUnitarioMomento; }
    public void setPrecioUnitarioMomento(Integer precioUnitarioMomento) { this.precioUnitarioMomento = precioUnitarioMomento; }

    public Carrito getCarrito() { return carrito; }
    public void setCarrito(Carrito carrito) { this.carrito = carrito; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
}
