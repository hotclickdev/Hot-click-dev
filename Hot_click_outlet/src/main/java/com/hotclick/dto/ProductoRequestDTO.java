package com.hotclick.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ProductoRequestDTO {

    @NotBlank(message = "El nombre del producto es obligatorio")
    @Size(min = 2, max = 200, message = "El nombre debe tener entre 2 y 200 caracteres")
    private String nombreProducto;

    @Size(max = 500, message = "La descripción corta no puede superar 500 caracteres")
    private String descripcionCorta;

    @NotNull(message = "El precio de compra es obligatorio")
    @Min(value = 0, message = "El precio de compra no puede ser negativo")
    private Integer precioCompra;

    @NotNull(message = "El precio de venta es obligatorio")
    @Min(value = 1, message = "El precio de venta debe ser mayor a 0")
    private Integer precioVenta;

    @Min(value = 0, message = "El stock actual no puede ser negativo")
    private Integer stockActual;

    @Min(value = 0, message = "El stock mínimo no puede ser negativo")
    private Integer stockMinimo;

    @Size(max = 1000, message = "El link no puede superar 1000 caracteres")
    @Pattern(regexp = "^(https?://.*)?$", message = "El link debe comenzar con http:// o https://")
    private String linkAmazon;

    @Size(max = 1000, message = "La URL de imagen no puede superar 1000 caracteres")
    private String imagenPrincipalUrl;

    private Boolean visibleCatalogo = true;
    private Boolean destacado = false;
    private Long categoriaId;
    private Long bodegaId;

    @Pattern(regexp = "^(NUEVO|USADO|REACONDICIONADO)?$", message = "La condición debe ser NUEVO, USADO o REACONDICIONADO")
    private String condicion = "NUEVO";

    @Size(max = 200, message = "El título no puede superar 200 caracteres")
    private String tituloProducto;

    @Size(max = 5000, message = "Las especificaciones no pueden superar 5000 caracteres")
    private String especificaciones;

    @Size(max = 3000, message = "El campo cómo usar no puede superar 3000 caracteres")
    private String comoUsar;

    @Size(max = 10000, message = "La descripción larga no puede superar 10000 caracteres")
    private String descripcionLarga;

    @Size(max = 100, message = "El texto de marca no puede superar 100 caracteres")
    private String marcaTexto;

    private Long marcaId;

    @Size(max = 70, message = "El meta title no puede superar 70 caracteres")
    private String metaTitle;

    @Size(max = 160, message = "El meta description no puede superar 160 caracteres")
    private String metaDescription;

    @Size(max = 200, message = "Las meta keywords no pueden superar 200 caracteres")
    private String metaKeywords;

    @Size(max = 70, message = "El meta title EN no puede superar 70 caracteres")
    private String metaTitleEn;

    @Size(max = 70, message = "El meta title PT no puede superar 70 caracteres")
    private String metaTitlePt;

    @Size(max = 70, message = "El meta title FR no puede superar 70 caracteres")
    private String metaTitleFr;

    @Size(max = 160, message = "El meta description EN no puede superar 160 caracteres")
    private String metaDescriptionEn;

    @Size(max = 160, message = "El meta description PT no puede superar 160 caracteres")
    private String metaDescriptionPt;

    @Size(max = 160, message = "El meta description FR no puede superar 160 caracteres")
    private String metaDescriptionFr;

    @Size(max = 1000, message = "La URL del video no puede superar 1000 caracteres")
    @Pattern(regexp = "^(https?://.*)?$", message = "La URL del video debe comenzar con http:// o https://")
    private String videoUrl;

    @Size(max = 50, message = "La talla no puede superar 50 caracteres")
    private String talla;

    @Size(max = 64, message = "El grupo de variante no puede superar 64 caracteres")
    private String grupoVarianteId;

    @Size(max = 50, message = "El color de variante no puede superar 50 caracteres")
    private String colorVariante;

    @Size(max = 500, message = "Los tags no pueden superar 500 caracteres")
    private String tags;

    private Boolean esPersonalizado = false;

    @Pattern(regexp = "^(FIJO|RANGO|COTIZACION)?$", message = "Modo de precio inválido")
    private String modoPrecioPersonalizado;

    @Min(value = 0, message = "El precio mínimo no puede ser negativo")
    private Integer precioPersonalizadoMin;

    @Min(value = 0, message = "El precio máximo no puede ser negativo")
    private Integer precioPersonalizadoMax;

    @Size(max = 3000, message = "Las instrucciones no pueden superar 3000 caracteres")
    private String instruccionesPersonalizacion;

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String v) { this.nombreProducto = v; }
    public String getDescripcionCorta() { return descripcionCorta; }
    public void setDescripcionCorta(String v) { this.descripcionCorta = v; }
    public Integer getPrecioCompra() { return precioCompra; }
    public void setPrecioCompra(Integer v) { this.precioCompra = v; }
    public Integer getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(Integer v) { this.precioVenta = v; }
    public Integer getStockActual() { return stockActual; }
    public void setStockActual(Integer v) { this.stockActual = v; }
    public Integer getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(Integer v) { this.stockMinimo = v; }
    public String getLinkAmazon() { return linkAmazon; }
    public void setLinkAmazon(String v) { this.linkAmazon = v; }
    public String getImagenPrincipalUrl() { return imagenPrincipalUrl; }
    public void setImagenPrincipalUrl(String v) { this.imagenPrincipalUrl = v; }
    public Boolean getVisibleCatalogo() { return visibleCatalogo; }
    public void setVisibleCatalogo(Boolean v) { this.visibleCatalogo = v; }
    public Boolean getDestacado() { return destacado; }
    public void setDestacado(Boolean v) { this.destacado = v; }
    public Long getCategoriaId() { return categoriaId; }
    public void setCategoriaId(Long v) { this.categoriaId = v; }
    public Long getBodegaId() { return bodegaId; }
    public void setBodegaId(Long v) { this.bodegaId = v; }
    public String getCondicion() { return condicion; }
    public void setCondicion(String v) { this.condicion = v; }
    public String getTituloProducto() { return tituloProducto; }
    public void setTituloProducto(String v) { this.tituloProducto = v; }
    public String getEspecificaciones() { return especificaciones; }
    public void setEspecificaciones(String v) { this.especificaciones = v; }
    public String getComoUsar() { return comoUsar; }
    public void setComoUsar(String v) { this.comoUsar = v; }
    public String getDescripcionLarga() { return descripcionLarga; }
    public void setDescripcionLarga(String v) { this.descripcionLarga = v; }
    public String getMarcaTexto() { return marcaTexto; }
    public void setMarcaTexto(String v) { this.marcaTexto = v; }
    public Long getMarcaId() { return marcaId; }
    public void setMarcaId(Long v) { this.marcaId = v; }
    public String getMetaTitle() { return metaTitle; }
    public void setMetaTitle(String v) { this.metaTitle = v; }
    public String getMetaDescription() { return metaDescription; }
    public void setMetaDescription(String v) { this.metaDescription = v; }
    public String getMetaKeywords() { return metaKeywords; }
    public void setMetaKeywords(String v) { this.metaKeywords = v; }
    public String getMetaTitleEn() { return metaTitleEn; }
    public void setMetaTitleEn(String v) { this.metaTitleEn = v; }
    public String getMetaTitlePt() { return metaTitlePt; }
    public void setMetaTitlePt(String v) { this.metaTitlePt = v; }
    public String getMetaTitleFr() { return metaTitleFr; }
    public void setMetaTitleFr(String v) { this.metaTitleFr = v; }
    public String getMetaDescriptionEn() { return metaDescriptionEn; }
    public void setMetaDescriptionEn(String v) { this.metaDescriptionEn = v; }
    public String getMetaDescriptionPt() { return metaDescriptionPt; }
    public void setMetaDescriptionPt(String v) { this.metaDescriptionPt = v; }
    public String getMetaDescriptionFr() { return metaDescriptionFr; }
    public void setMetaDescriptionFr(String v) { this.metaDescriptionFr = v; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String v) { this.videoUrl = v; }
    public String getTalla() { return talla; }
    public void setTalla(String v) { this.talla = v; }
    public String getGrupoVarianteId() { return grupoVarianteId; }
    public void setGrupoVarianteId(String v) { this.grupoVarianteId = v; }
    public String getColorVariante() { return colorVariante; }
    public void setColorVariante(String v) { this.colorVariante = v; }
    public String getTags() { return tags; }
    public void setTags(String v) { this.tags = v; }
    public Boolean getEsPersonalizado() { return esPersonalizado; }
    public void setEsPersonalizado(Boolean v) { this.esPersonalizado = v; }
    public String getModoPrecioPersonalizado() { return modoPrecioPersonalizado; }
    public void setModoPrecioPersonalizado(String v) { this.modoPrecioPersonalizado = v; }
    public Integer getPrecioPersonalizadoMin() { return precioPersonalizadoMin; }
    public void setPrecioPersonalizadoMin(Integer v) { this.precioPersonalizadoMin = v; }
    public Integer getPrecioPersonalizadoMax() { return precioPersonalizadoMax; }
    public void setPrecioPersonalizadoMax(Integer v) { this.precioPersonalizadoMax = v; }
    public String getInstruccionesPersonalizacion() { return instruccionesPersonalizacion; }
    public void setInstruccionesPersonalizacion(String v) { this.instruccionesPersonalizacion = v; }
}
