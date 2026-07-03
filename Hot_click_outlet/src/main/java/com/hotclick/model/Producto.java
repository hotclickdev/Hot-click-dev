package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    /** Unidades actualmente en carritos activos, no vendidas todavía. */
    @Column(name = "stock_reservado", columnDefinition = "INTEGER NOT NULL DEFAULT 0")
    private Integer stockReservado = 0;

    @Column(name = "stock_minimo", nullable = false)
    private Integer stockMinimo = 5;

    @Column(name = "stock_maximo")
    private Integer stockMaximo;

    @Column(name = "unidad_medida", length = 20)
    private String unidadMedida = "UNIDAD";

    @Column(name = "peso_en_gramos")
    private Integer pesoEnGramos;

    @Column(name = "sku", length = 50)
    private String sku;

    @Column(name = "barcode", length = 50)
    private String barcode;

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

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_admin_cliente", nullable = false)
    private Usuario adminCliente;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_ultima_compra")
    private LocalDate fechaUltimaCompra;

    @Column(name = "proveedor_principal", length = 100)
    private String proveedorPrincipal;

    @Column(name = "tiempo_reorden_dias")
    private Integer tiempoReordenDias = 7;

    // ── Product discovery chat (F26) ─────────────────────────────────────────
    /** Comma-separated keywords for public chat product search. e.g. "sala,living,decoracion" */
    @Column(name = "tags", columnDefinition = "text")
    private String tags = "";

    // ── AI Smart Inventory (F21) ─────────────────────────────────────────────
    @Column(name = "clasificacion_abc", length = 1)
    private String clasificacionAbc;

    @Column(name = "demanda_diaria_avg", precision = 10, scale = 2)
    private java.math.BigDecimal demandaDiariaAvg = java.math.BigDecimal.ZERO;

    @Column(name = "fecha_ultima_venta")
    private LocalDateTime fechaUltimaVenta;

    @Column(name = "imagen_principal_url", length = 500)
    private String imagenPrincipalUrl;

    /** Estado físico del producto: NUEVO, COMO_NUEVO, USADO */
    @Column(name = "condicion", length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'NUEVO'")
    private String condicion = "NUEVO";

    @Column(name = "fecha_agotado")
    private LocalDateTime fechaAgotado;

    @Column(name = "titulo_producto", length = 300)
    private String tituloProducto;

    @Column(name = "especificaciones", columnDefinition = "TEXT")
    private String especificaciones;

    @Column(name = "como_usar", columnDefinition = "TEXT")
    private String comoUsar;

    @Column(name = "en_carrusel", nullable = false)
    private Boolean enCarrusel = false;

    @Column(name = "orden_carrusel")
    private Integer ordenCarrusel = 0;

    @Column(name = "meta_title", length = 70)
    private String metaTitle;

    @Column(name = "meta_description", length = 160)
    private String metaDescription;

    @Column(name = "meta_keywords", length = 255)
    private String metaKeywords;

    @Column(name = "meta_title_en", length = 70)
    private String metaTitleEn;

    @Column(name = "meta_title_pt", length = 70)
    private String metaTitlePt;

    @Column(name = "meta_title_fr", length = 70)
    private String metaTitleFr;

    @Column(name = "meta_description_en", length = 160)
    private String metaDescriptionEn;

    @Column(name = "meta_description_pt", length = 160)
    private String metaDescriptionPt;

    @Column(name = "meta_description_fr", length = 160)
    private String metaDescriptionFr;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "talla", length = 20)
    private String talla;

    /** Tag compartido entre filas de producto que son la misma pieza en distinto color/talla. */
    @Column(name = "grupo_variante_id", length = 64)
    private String grupoVarianteId;

    /** Nombre del color de esta variante puntual (ej. "Marrón oscuro"), para mostrar como swatch. */
    @Column(name = "color_variante", length = 50)
    private String colorVariante;

    @Column(name = "garantia_dias", columnDefinition = "INTEGER DEFAULT 0")
    private Integer garantiaDias = 0;

    @Column(name = "en_oferta", nullable = false)
    private Boolean enOferta = false;

    @Column(name = "precio_oferta")
    private Integer precioOferta;

    @Column(name = "porcentaje_descuento")
    private Integer porcentajeDescuento;

    // ── IVA Hacienda CR (F12) ────────────────────────────────────────────────
    /** Porcentaje de IVA: 13.00 (general), 4.00, 2.00, 0.00 (exento) */
    @Column(name = "porcentaje_iva", columnDefinition = "NUMERIC(5,2) DEFAULT 13.00")
    private java.math.BigDecimal porcentajeIva = new java.math.BigDecimal("13.00");

    /** Código de tarifa Hacienda: '08'=13%, '04'=4%, '02'=2%, '01'=exento */
    @Column(name = "codigo_tarifa_iva", length = 2, columnDefinition = "VARCHAR(2) DEFAULT '08'")
    private String codigoTarifaIva = "08";

    // ── Calificación de producto (F-rating) ──────────────────────────────────
    @Column(name = "rating_promedio", precision = 3, scale = 2, columnDefinition = "NUMERIC(3,2) DEFAULT 0.00")
    private java.math.BigDecimal ratingPromedio = java.math.BigDecimal.ZERO;

    @Column(name = "total_resenas", columnDefinition = "INTEGER DEFAULT 0")
    private Integer totalResenas = 0;

    /**
     * Optimistic locking — previene race condition cuando dos cajeros venden
     * el mismo producto simultáneamente. Hibernate lanza OptimisticLockException
     * si otro thread modificó el registro entre el SELECT y el UPDATE.
     * StockService debe reintentar ante OptimisticLockException (máx 3 veces).
     */
    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 0;

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

    public Integer getStockReservado() { return stockReservado != null ? stockReservado : 0; }
    public void setStockReservado(Integer stockReservado) { this.stockReservado = stockReservado; }

    public Integer getStockDisponible() { return getStockActual() - getStockReservado(); }

    /** Alias para el frontend: 'stock' = unidades disponibles reales (actual − reservado). */
    public Integer getStock() { return getStockDisponible(); }

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

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }

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

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Long getEmpresaId() { return empresa != null ? empresa.getId() : null; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDate getFechaUltimaCompra() { return fechaUltimaCompra; }
    public void setFechaUltimaCompra(LocalDate fechaUltimaCompra) { this.fechaUltimaCompra = fechaUltimaCompra; }

    public String getProveedorPrincipal() { return proveedorPrincipal; }
    public void setProveedorPrincipal(String proveedorPrincipal) { this.proveedorPrincipal = proveedorPrincipal; }

    public Integer getTiempoReordenDias() { return tiempoReordenDias; }
    public void setTiempoReordenDias(Integer tiempoReordenDias) { this.tiempoReordenDias = tiempoReordenDias; }

    public String getTags() { return tags != null ? tags : ""; }
    public void setTags(String tags) { this.tags = tags; }

    public String getClasificacionAbc() { return clasificacionAbc; }
    public void setClasificacionAbc(String v) { this.clasificacionAbc = v; }

    public java.math.BigDecimal getDemandaDiariaAvg() { return demandaDiariaAvg; }
    public void setDemandaDiariaAvg(java.math.BigDecimal v) { this.demandaDiariaAvg = v; }

    public LocalDateTime getFechaUltimaVenta() { return fechaUltimaVenta; }
    public void setFechaUltimaVenta(LocalDateTime v) { this.fechaUltimaVenta = v; }

    public String getImagenPrincipalUrl() { return imagenPrincipalUrl; }
    public void setImagenPrincipalUrl(String imagenPrincipalUrl) { this.imagenPrincipalUrl = imagenPrincipalUrl; }

    public String getCondicion() { return condicion != null ? condicion : "NUEVO"; }
    public void setCondicion(String condicion) { this.condicion = condicion; }

    public String getTituloProducto() { return tituloProducto; }
    public void setTituloProducto(String tituloProducto) { this.tituloProducto = tituloProducto; }

    public String getEspecificaciones() { return especificaciones; }
    public void setEspecificaciones(String especificaciones) { this.especificaciones = especificaciones; }

    public String getComoUsar() { return comoUsar; }
    public void setComoUsar(String comoUsar) { this.comoUsar = comoUsar; }

    public LocalDateTime getFechaAgotado() { return fechaAgotado; }
    public void setFechaAgotado(LocalDateTime fechaAgotado) { this.fechaAgotado = fechaAgotado; }

    public Boolean getEnCarrusel() { return enCarrusel != null ? enCarrusel : false; }
    public void setEnCarrusel(Boolean enCarrusel) { this.enCarrusel = enCarrusel; }

    public Integer getOrdenCarrusel() { return ordenCarrusel != null ? ordenCarrusel : 0; }
    public void setOrdenCarrusel(Integer ordenCarrusel) { this.ordenCarrusel = ordenCarrusel; }

    public String getMetaTitle() { return metaTitle; }
    public void setMetaTitle(String metaTitle) { this.metaTitle = metaTitle; }

    public String getMetaDescription() { return metaDescription; }
    public void setMetaDescription(String metaDescription) { this.metaDescription = metaDescription; }

    public String getMetaKeywords() { return metaKeywords; }
    public void setMetaKeywords(String metaKeywords) { this.metaKeywords = metaKeywords; }

    public String getMetaTitleEn() { return metaTitleEn; }
    public void setMetaTitleEn(String metaTitleEn) { this.metaTitleEn = metaTitleEn; }

    public String getMetaTitlePt() { return metaTitlePt; }
    public void setMetaTitlePt(String metaTitlePt) { this.metaTitlePt = metaTitlePt; }

    public String getMetaTitleFr() { return metaTitleFr; }
    public void setMetaTitleFr(String metaTitleFr) { this.metaTitleFr = metaTitleFr; }

    public String getMetaDescriptionEn() { return metaDescriptionEn; }
    public void setMetaDescriptionEn(String metaDescriptionEn) { this.metaDescriptionEn = metaDescriptionEn; }

    public String getMetaDescriptionPt() { return metaDescriptionPt; }
    public void setMetaDescriptionPt(String metaDescriptionPt) { this.metaDescriptionPt = metaDescriptionPt; }

    public String getMetaDescriptionFr() { return metaDescriptionFr; }
    public void setMetaDescriptionFr(String metaDescriptionFr) { this.metaDescriptionFr = metaDescriptionFr; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getTalla() { return talla; }
    public void setTalla(String talla) { this.talla = talla; }

    public String getGrupoVarianteId() { return grupoVarianteId; }
    public void setGrupoVarianteId(String grupoVarianteId) { this.grupoVarianteId = grupoVarianteId; }

    public String getColorVariante() { return colorVariante; }
    public void setColorVariante(String colorVariante) { this.colorVariante = colorVariante; }

    public Integer getGarantiaDias() { return garantiaDias != null ? garantiaDias : 0; }
    public void setGarantiaDias(Integer garantiaDias) { this.garantiaDias = garantiaDias; }

    public Boolean getEnOferta() { return enOferta != null ? enOferta : false; }
    public void setEnOferta(Boolean enOferta) { this.enOferta = enOferta; }

    public Integer getPrecioOferta() { return precioOferta; }
    public void setPrecioOferta(Integer precioOferta) { this.precioOferta = precioOferta; }

    public Integer getPorcentajeDescuento() { return porcentajeDescuento; }
    public void setPorcentajeDescuento(Integer porcentajeDescuento) { this.porcentajeDescuento = porcentajeDescuento; }

    public java.math.BigDecimal getRatingPromedio() { return ratingPromedio != null ? ratingPromedio : java.math.BigDecimal.ZERO; }
    public void setRatingPromedio(java.math.BigDecimal v) { this.ratingPromedio = v; }

    public Integer getTotalResenas() { return totalResenas != null ? totalResenas : 0; }
    public void setTotalResenas(Integer v) { this.totalResenas = v; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    public java.math.BigDecimal getPorcentajeIva() { return porcentajeIva != null ? porcentajeIva : new java.math.BigDecimal("13.00"); }
    public void setPorcentajeIva(java.math.BigDecimal v) { this.porcentajeIva = v; }

    public String getCodigoTarifaIva() { return codigoTarifaIva != null ? codigoTarifaIva : "08"; }
    public void setCodigoTarifaIva(String v) { this.codigoTarifaIva = v; }

    /** Precio efectivo para el cliente: precioOferta si está en oferta, sino precioVenta */
    public Integer getPrecioEfectivo() {
        return Boolean.TRUE.equals(enOferta) && precioOferta != null ? precioOferta : precioVenta;
    }
}
