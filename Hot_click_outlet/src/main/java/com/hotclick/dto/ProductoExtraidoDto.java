package com.hotclick.dto;

public class ProductoExtraidoDto {

    private String nombreProducto;
    private Integer precioVenta;
    private Integer precioCompra;
    private String descripcionCorta;
    private String imagenPrincipalUrl;
    private String sku;
    private String marcaTexto;
    private Long categoriaId;
    private Long marcaId;
    private Long bodegaId;
    private Integer stockActual;
    private String grupoVarianteId;
    private String colorVariante;

    public ProductoExtraidoDto() {}

    public String getNombreProducto()           { return nombreProducto; }
    public void   setNombreProducto(String v)   { this.nombreProducto = v; }

    public Integer getPrecioVenta()             { return precioVenta; }
    public void    setPrecioVenta(Integer v)    { this.precioVenta = v; }

    public Integer getPrecioCompra()            { return precioCompra; }
    public void    setPrecioCompra(Integer v)   { this.precioCompra = v; }

    public String getDescripcionCorta()         { return descripcionCorta; }
    public void   setDescripcionCorta(String v) { this.descripcionCorta = v; }

    public String getImagenPrincipalUrl()           { return imagenPrincipalUrl; }
    public void   setImagenPrincipalUrl(String v)   { this.imagenPrincipalUrl = v; }

    public String getSku()          { return sku; }
    public void   setSku(String v)  { this.sku = v; }

    public String getMarcaTexto()           { return marcaTexto; }
    public void   setMarcaTexto(String v)   { this.marcaTexto = v; }

    public Long getCategoriaId()            { return categoriaId; }
    public void setCategoriaId(Long v)      { this.categoriaId = v; }

    public Long getMarcaId()                { return marcaId; }
    public void setMarcaId(Long v)          { this.marcaId = v; }

    public Long getBodegaId()               { return bodegaId; }
    public void setBodegaId(Long v)         { this.bodegaId = v; }

    public Integer getStockActual()         { return stockActual; }
    public void    setStockActual(Integer v){ this.stockActual = v; }

    public String getGrupoVarianteId()          { return grupoVarianteId; }
    public void   setGrupoVarianteId(String v)  { this.grupoVarianteId = v; }

    public String getColorVariante()            { return colorVariante; }
    public void   setColorVariante(String v)    { this.colorVariante = v; }
}
