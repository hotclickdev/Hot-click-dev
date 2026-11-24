package com.hotclick.agente.enlace;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_enlace_compra_item_tb")
public class EnlaceCompraItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_enlace_compra_item")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fk_id_enlace_compra", nullable = false)
    private EnlaceCompra enlace;

    @Column(name = "fk_id_producto", nullable = false)
    private Long productoId;

    @Column(name = "cantidad", nullable = false)
    private int cantidad;

    @Column(name = "precio_unitario_creado", nullable = false)
    private int precioUnitarioCreado;

    /** Unidades que este enlace tiene sumadas en producto.stock_reservado (AG-09). */
    @Column(name = "cantidad_reservada", nullable = false)
    private int cantidadReservada;

    public EnlaceCompraItem() { }

    public EnlaceCompraItem(Long productoId, int cantidad, int precioUnitarioCreado) {
        this.productoId = productoId;
        this.cantidad = cantidad;
        this.precioUnitarioCreado = precioUnitarioCreado;
    }

    public Long getId() { return id; }
    public EnlaceCompra getEnlace() { return enlace; }
    void setEnlace(EnlaceCompra enlace) { this.enlace = enlace; }
    public Long getProductoId() { return productoId; }
    public int getCantidad() { return cantidad; }
    public int getPrecioUnitarioCreado() { return precioUnitarioCreado; }
    public int getCantidadReservada() { return cantidadReservada; }
    public void setCantidadReservada(int cantidadReservada) { this.cantidadReservada = cantidadReservada; }
}
