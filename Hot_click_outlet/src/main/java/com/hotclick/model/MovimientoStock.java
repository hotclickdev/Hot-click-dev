package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_movimiento_stock_tb")
public class MovimientoStock {

    // Tipos de movimiento
    public static final String VENTA               = "VENTA";
    public static final String VENTA_POS           = "VENTA_POS";
    public static final String RESERVA             = "RESERVA";
    public static final String LIBERACION_RESERVA  = "LIBERACION_RESERVA";
    public static final String AJUSTE_ENTRADA      = "AJUSTE_ENTRADA";
    public static final String AJUSTE_SALIDA       = "AJUSTE_SALIDA";
    public static final String DEVOLUCION          = "DEVOLUCION";
    public static final String TRANSFERENCIA       = "TRANSFERENCIA";
    public static final String COMPRA              = "COMPRA";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "movimiento_stock_seq")
    @SequenceGenerator(name = "movimiento_stock_seq", sequenceName = "hot_click_movimiento_stock_seq", allocationSize = 50)
    @Column(name = "id_movimiento")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    @Column(name = "tipo_movimiento", nullable = false, length = 30)
    private String tipoMovimiento;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    @Column(name = "stock_actual_antes", nullable = false)
    private Integer stockActualAntes;

    @Column(name = "stock_actual_despues", nullable = false)
    private Integer stockActualDespues;

    @Column(name = "stock_reservado_antes", nullable = false)
    private Integer stockReservadoAntes;

    @Column(name = "stock_reservado_despues", nullable = false)
    private Integer stockReservadoDespues;

    /** Número de pedido, ID de carrito, o descripción del ajuste manual. */
    @Column(name = "referencia", length = 100)
    private String referencia;

    @Column(name = "operador_correo", length = 200)
    private String operadorCorreo;

    @Column(name = "fecha_movimiento", nullable = false)
    private LocalDateTime fechaMovimiento;

    @Column(name = "notas", length = 500)
    private String notas;

    @Column(name = "tipo", length = 30)
    private String tipo;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(name = "referencia_tipo", length = 30)
    private String referenciaTipo;

    // ── Getters / Setters ───────────────────────────────────────────────────────

    public Long getId() { return id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public String getTipoMovimiento() { return tipoMovimiento; }
    public void setTipoMovimiento(String tipoMovimiento) { this.tipoMovimiento = tipoMovimiento; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public Integer getStockActualAntes() { return stockActualAntes; }
    public void setStockActualAntes(Integer stockActualAntes) { this.stockActualAntes = stockActualAntes; }

    public Integer getStockActualDespues() { return stockActualDespues; }
    public void setStockActualDespues(Integer stockActualDespues) { this.stockActualDespues = stockActualDespues; }

    public Integer getStockReservadoAntes() { return stockReservadoAntes; }
    public void setStockReservadoAntes(Integer stockReservadoAntes) { this.stockReservadoAntes = stockReservadoAntes; }

    public Integer getStockReservadoDespues() { return stockReservadoDespues; }
    public void setStockReservadoDespues(Integer stockReservadoDespues) { this.stockReservadoDespues = stockReservadoDespues; }

    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }

    public String getOperadorCorreo() { return operadorCorreo; }
    public void setOperadorCorreo(String operadorCorreo) { this.operadorCorreo = operadorCorreo; }

    public LocalDateTime getFechaMovimiento() { return fechaMovimiento; }
    public void setFechaMovimiento(LocalDateTime fechaMovimiento) { this.fechaMovimiento = fechaMovimiento; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Long getReferenciaId() { return referenciaId; }
    public void setReferenciaId(Long referenciaId) { this.referenciaId = referenciaId; }

    public String getReferenciaTipo() { return referenciaTipo; }
    public void setReferenciaTipo(String referenciaTipo) { this.referenciaTipo = referenciaTipo; }
}
