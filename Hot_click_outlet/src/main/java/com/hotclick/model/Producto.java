package com.hotclick.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_producto_tb")
public class Producto extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto")
    private Long id;

    @Column(name = "nombre_producto", nullable = false, length = 200)
    private String nombreProducto;

    @Column(name = "descripcion_corta", length = 300)
    private String descripcionCorta;

    @Column(name = "descripcion_larga")
    private String descripcionLarga;

    @Column(name = "precio_compra", nullable = false)
    private Integer precioCompra;

    @Column(name = "precio_venta", nullable = false)
    private Integer precioVenta;

    @Column(name = "margen_ganancia", precision = 8, scale = 2)
    private BigDecimal margenGanancia;

    @Column(name = "roi_porcentaje", precision = 8, scale = 2)
    private BigDecimal roiPorcentaje;

    @Column(name = "costo_envio_estimado")
    private Integer costoEnvioEstimado;

    @Column(name = "costo_almacenaje")
    private Integer costoAlmacenaje;

    @Column(name = "link_amazon", length = 500)
    private String linkAmazon;

    @Column(name = "stock_actual", nullable = false)
    private Integer stockActual = 0;

    @Column(name = "stock_minimo", nullable = false)
    private Integer stockMinimo = 5;

    @Column(name = "stock_maximo")
    private Integer stockMaximo;

    @Column(name = "unidad_medida", length = 20)
    private String unidadMedida = "UNIDAD";

    @Column(name = "peso_en_gramos")
    private Integer pesoEnGramos;

    @Column(name = "sku", unique = true, length = 50)
    private String sku;

    @Column(name = "marca", length = 100)
    private String marcaTexto;

    @Column(name = "modelo", length = 100)
    private String modelo;

    @Column(name = "rango_precio", length = 20)
    private String rangoPrecio;

    @Column(name = "es_unico", nullable = false)
    private Boolean esUnico = false;

    @Column(name = "vendido", nullable = false)
    private Boolean vendido = false;

    @Column(name = "destacado", nullable = false)
    private Boolean destacado = false;

    @Column(name = "visible_catalogo", nullable = false)
    private Boolean visibleCatalogo = true;

    @ManyToOne
    @JoinColumn(name = "fk_id_bodega", nullable = false)
    private Bodega bodega;

    @ManyToOne
    @JoinColumn(name = "fk_id_categoria", nullable = false)
    private Categoria categoria;

    @ManyToOne
    @JoinColumn(name = "fk_id_marca")
    private Marca marca;

    @ManyToOne
    @JoinColumn(name = "fk_id_admin_cliente", nullable = false)
    private Usuario adminCliente;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_ultima_compra")
    private LocalDate fechaUltimaCompra;

    @Column(name = "proveedor_principal", length = 100)
    private String proveedorPrincipal;

    @Column(name = "tiempo_reorden_dias")
    private Integer tiempoReordenDias = 7;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }

    public String getDescripcionCorta() { return descripcionCorta; }
    public void setDescripcionCorta(String descripcionCorta) { this.descripcionCorta = descripcionCorta; }

    public String getDescripcionLarga() { return descripcionLarga; }
    public void setDescripcionLarga(String descripcionLarga) { this.descripcionLarga = descripcionLarga; }

    public Integer getPrecioCompra() { return precioCompra; }
    public void setPrecioCompra(Integer precioCompra) { this.precioCompra = precioCompra; }

    public Integer getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(Integer precioVenta) { this.precioVenta = precioVenta; }

    public BigDecimal getMargenGanancia() { return margenGanancia; }
    public void setMargenGanancia(BigDecimal margenGanancia) { this.margenGanancia = margenGanancia; }

    public BigDecimal getRoiPorcentaje() { return roiPorcentaje; }
    public void setRoiPorcentaje(BigDecimal roiPorcentaje) { this.roiPorcentaje = roiPorcentaje; }

    public Integer getCostoEnvioEstimado() { return costoEnvioEstimado; }
    public void setCostoEnvioEstimado(Integer costoEnvioEstimado) { this.costoEnvioEstimado = costoEnvioEstimado; }

    public Integer getCostoAlmacenaje() { return costoAlmacenaje; }
    public void setCostoAlmacenaje(Integer costoAlmacenaje) { this.costoAlmacenaje = costoAlmacenaje; }

    public String getLinkAmazon() { return linkAmazon; }
    public void setLinkAmazon(String linkAmazon) { this.linkAmazon = linkAmazon; }

    public Integer getStockActual() { return stockActual; }
    public void setStockActual(Integer stockActual) { this.stockActual = stockActual; }

    public Integer getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(Integer stockMinimo) { this.stockMinimo = stockMinimo; }

    public Integer getStockMaximo() { return stockMaximo; }
    public void setStockMaximo(Integer stockMaximo) { this.stockMaximo = stockMaximo; }

    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }

    public Integer getPesoEnGramos() { return pesoEnGramos; }
    public void setPesoEnGramos(Integer pesoEnGramos) { this.pesoEnGramos = pesoEnGramos; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getMarcaTexto() { return marcaTexto; }
    public void setMarcaTexto(String marcaTexto) { this.marcaTexto = marcaTexto; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public String getRangoPrecio() { return rangoPrecio; }
    public void setRangoPrecio(String rangoPrecio) { this.rangoPrecio = rangoPrecio; }

    public Boolean getEsUnico() { return esUnico; }
    public void setEsUnico(Boolean esUnico) { this.esUnico = esUnico; }

    public Boolean getVendido() { return vendido; }
    public void setVendido(Boolean vendido) { this.vendido = vendido; }

    public Boolean getDestacado() { return destacado; }
    public void setDestacado(Boolean destacado) { this.destacado = destacado; }

    public Boolean getVisibleCatalogo() { return visibleCatalogo; }
    public void setVisibleCatalogo(Boolean visibleCatalogo) { this.visibleCatalogo = visibleCatalogo; }

    public Bodega getBodega() { return bodega; }
    public void setBodega(Bodega bodega) { this.bodega = bodega; }

    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }

    public Marca getMarca() { return marca; }
    public void setMarca(Marca marca) { this.marca = marca; }

    public Usuario getAdminCliente() { return adminCliente; }
    public void setAdminCliente(Usuario adminCliente) { this.adminCliente = adminCliente; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDate getFechaUltimaCompra() { return fechaUltimaCompra; }
    public void setFechaUltimaCompra(LocalDate fechaUltimaCompra) { this.fechaUltimaCompra = fechaUltimaCompra; }

    public String getProveedorPrincipal() { return proveedorPrincipal; }
    public void setProveedorPrincipal(String proveedorPrincipal) { this.proveedorPrincipal = proveedorPrincipal; }

    public Integer getTiempoReordenDias() { return tiempoReordenDias; }
    public void setTiempoReordenDias(Integer tiempoReordenDias) { this.tiempoReordenDias = tiempoReordenDias; }
}
