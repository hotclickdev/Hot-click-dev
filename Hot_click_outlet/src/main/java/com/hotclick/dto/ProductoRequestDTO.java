package com.hotclick.dto;

public class ProductoRequestDTO {
    private String nombreProducto;
    private String descripcionCorta;
    private Integer precioCompra;
    private Integer precioVenta;
    private Integer stockActual;
    private Integer stockMinimo;
    private String linkAmazon;
    private String imagenPrincipalUrl;
    private Boolean visibleCatalogo = true;
    private Boolean destacado = false;
    private Long categoriaId;
    private Long bodegaId;
    private String condicion = "NUEVO";

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }

    public String getDescripcionCorta() { return descripcionCorta; }
    public void setDescripcionCorta(String descripcionCorta) { this.descripcionCorta = descripcionCorta; }

    public Integer getPrecioCompra() { return precioCompra; }
    public void setPrecioCompra(Integer precioCompra) { this.precioCompra = precioCompra; }

    public Integer getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(Integer precioVenta) { this.precioVenta = precioVenta; }

    public Integer getStockActual() { return stockActual; }
    public void setStockActual(Integer stockActual) { this.stockActual = stockActual; }

    public Integer getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(Integer stockMinimo) { this.stockMinimo = stockMinimo; }

    public String getLinkAmazon() { return linkAmazon; }
    public void setLinkAmazon(String linkAmazon) { this.linkAmazon = linkAmazon; }

    public String getImagenPrincipalUrl() { return imagenPrincipalUrl; }
    public void setImagenPrincipalUrl(String imagenPrincipalUrl) { this.imagenPrincipalUrl = imagenPrincipalUrl; }

    public Boolean getVisibleCatalogo() { return visibleCatalogo; }
    public void setVisibleCatalogo(Boolean visibleCatalogo) { this.visibleCatalogo = visibleCatalogo; }

    public Boolean getDestacado() { return destacado; }
    public void setDestacado(Boolean destacado) { this.destacado = destacado; }

    public Long getCategoriaId() { return categoriaId; }
    public void setCategoriaId(Long categoriaId) { this.categoriaId = categoriaId; }

    public Long getBodegaId() { return bodegaId; }
    public void setBodegaId(Long bodegaId) { this.bodegaId = bodegaId; }

    public String getCondicion() { return condicion; }
    public void setCondicion(String condicion) { this.condicion = condicion; }

    private String tituloProducto;
    private String especificaciones;
    private String comoUsar;
    private String descripcionLarga;
    private String marcaTexto;
    private Long marcaId;

    public String getTituloProducto() { return tituloProducto; }
    public void setTituloProducto(String tituloProducto) { this.tituloProducto = tituloProducto; }

    public String getEspecificaciones() { return especificaciones; }
    public void setEspecificaciones(String especificaciones) { this.especificaciones = especificaciones; }

    public String getComoUsar() { return comoUsar; }
    public void setComoUsar(String comoUsar) { this.comoUsar = comoUsar; }

    public String getDescripcionLarga() { return descripcionLarga; }
    public void setDescripcionLarga(String descripcionLarga) { this.descripcionLarga = descripcionLarga; }

    public String getMarcaTexto() { return marcaTexto; }
    public void setMarcaTexto(String marcaTexto) { this.marcaTexto = marcaTexto; }

    public Long getMarcaId() { return marcaId; }
    public void setMarcaId(Long marcaId) { this.marcaId = marcaId; }

    private String metaTitle;
    private String metaDescription;
    private String metaKeywords;
    private String metaTitleEn;
    private String metaTitlePt;
    private String metaTitleFr;
    private String metaDescriptionEn;
    private String metaDescriptionPt;
    private String metaDescriptionFr;

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

    private String videoUrl;
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
}
