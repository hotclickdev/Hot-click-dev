package com.hotclick.dto.inventario;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PaqueteLineaRequest {

    @Size(max = 50)
    private String barcode;

    @Size(max = 50)
    private String sku;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 200)
    private String nombre;

    @Min(0)
    private Integer precioCompra = 0;

    @Min(1)
    private Integer precioVenta = 1;

    @Min(0)
    private Integer stock = 0;

    @Size(max = 100)
    private String marcaTexto;

    @Size(max = 100)
    private String categoriaTexto;

    @Size(max = 500)
    private String imagenUrl;

    @Size(max = 20)
    private String estado;

    @Size(max = 2000)
    private String notasConflicto;

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
    public String getNotasConflicto() { return notasConflicto; }
    public void setNotasConflicto(String notasConflicto) { this.notasConflicto = notasConflicto; }
}
