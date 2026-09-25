package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hotclick.utils.Constants;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_paquete_linea_tb")
public class PaqueteLinea {

    public static final String ESTADO_LISTO = "LISTO";
    public static final String ESTADO_CONFLICTO = "CONFLICTO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_linea")
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fk_id_paquete", nullable = false)
    private PaqueteInventario paquete;

    @Column(name = "barcode", length = 50)
    private String barcode;

    @Column(name = "sku", length = 50)
    private String sku;

    @Column(name = "nombre", nullable = false, length = 200)
    private String nombre;

    @Column(name = "precio_compra", nullable = false)
    private Integer precioCompra = 0;

    @Column(name = "precio_venta", nullable = false)
    private Integer precioVenta = 1;

    @Column(name = "stock", nullable = false)
    private Integer stock = 0;

    @Column(name = "marca_texto", length = 100)
    private String marcaTexto;

    @Column(name = "categoria_texto", length = 100)
    private String categoriaTexto;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = ESTADO_LISTO;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto")
    private Producto producto;

    @Column(name = "notas_conflicto", columnDefinition = "TEXT")
    private String notasConflicto;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);
        }
        if (estado == null) {
            estado = ESTADO_LISTO;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public PaqueteInventario getPaquete() { return paquete; }
    public void setPaquete(PaqueteInventario paquete) { this.paquete = paquete; }
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Integer getPrecioCompra() { return precioCompra; }
    public void setPrecioCompra(Integer precioCompra) { this.precioCompra = precioCompra; }
    public Integer getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(Integer precioVenta) { this.precioVenta = precioVenta; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public String getMarcaTexto() { return marcaTexto; }
    public void setMarcaTexto(String marcaTexto) { this.marcaTexto = marcaTexto; }
    public String getCategoriaTexto() { return categoriaTexto; }
    public void setCategoriaTexto(String categoriaTexto) { this.categoriaTexto = categoriaTexto; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Long getProductoId() { return producto != null ? producto.getId() : null; }
    public String getNotasConflicto() { return notasConflicto; }
    public void setNotasConflicto(String notasConflicto) { this.notasConflicto = notasConflicto; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
