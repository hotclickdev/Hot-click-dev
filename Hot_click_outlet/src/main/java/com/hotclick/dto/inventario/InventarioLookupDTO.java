package com.hotclick.dto.inventario;

public class InventarioLookupDTO {

    public static final String EN_PAQUETE = "EN_PAQUETE";
    public static final String EN_EMPRESA = "EN_EMPRESA";
    public static final String EN_MAESTRO = "EN_MAESTRO";
    public static final String NUEVO = "NUEVO";

    private String match;
    private String nombre;
    private String imagenUrl;
    private String marcaTexto;
    private String barcode;
    private Long productoId;
    private Long lineaId;
    private Integer stockActual;
    private Integer precioVenta;

    public static InventarioLookupDTO of(String match) {
        InventarioLookupDTO dto = new InventarioLookupDTO();
        dto.match = match;
        return dto;
    }

    public String getMatch() { return match; }
    public void setMatch(String match) { this.match = match; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }
    public String getMarcaTexto() { return marcaTexto; }
    public void setMarcaTexto(String marcaTexto) { this.marcaTexto = marcaTexto; }
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public Long getLineaId() { return lineaId; }
    public void setLineaId(Long lineaId) { this.lineaId = lineaId; }
    public Integer getStockActual() { return stockActual; }
    public void setStockActual(Integer stockActual) { this.stockActual = stockActual; }
    public Integer getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(Integer precioVenta) { this.precioVenta = precioVenta; }
}
