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
}
