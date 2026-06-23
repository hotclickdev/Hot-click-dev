package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_cotizacion_item_tb")
public class CotizacionItem {

    public static final String TIPO_CATALOGO = "CATALOGO";
    public static final String TIPO_TEMPORAL = "TEMPORAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cotizacion_id", nullable = false)
    @JsonIgnore
    private Cotizacion cotizacion;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo = TIPO_CATALOGO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private Producto producto;

    @Column(name = "codigo", length = 50)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 200)
    private String nombre;

    @Column(name = "descripcion", columnDefinition = "text")
    private String descripcion;

    @Column(name = "imagen_url", columnDefinition = "text")
    private String imagenUrl;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad = 1;

    @Column(name = "unidad_medida", length = 30)
    private String unidadMedida = "UNIDAD";

    @Column(name = "precio_unitario", nullable = false)
    private Integer precioUnitario = 0;

    @Column(name = "descuento_porcentaje")
    private Integer descuentoPorcentaje = 0;

    @Column(name = "subtotal_linea", nullable = false)
    private Integer subtotalLinea = 0;

    @Column(name = "orden")
    private Integer orden = 0;

    // ── Getters / Setters ────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Cotizacion getCotizacion() { return cotizacion; }
    public void setCotizacion(Cotizacion cotizacion) { this.cotizacion = cotizacion; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }

    public Integer getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(Integer precioUnitario) { this.precioUnitario = precioUnitario; }

    public Integer getDescuentoPorcentaje() { return descuentoPorcentaje; }
    public void setDescuentoPorcentaje(Integer descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }

    public Integer getSubtotalLinea() { return subtotalLinea; }
    public void setSubtotalLinea(Integer subtotalLinea) { this.subtotalLinea = subtotalLinea; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}
