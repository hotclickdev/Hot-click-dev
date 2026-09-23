package com.hotclick.dto.inventario;

import com.hotclick.model.PaqueteLinea;

import java.time.LocalDateTime;

public class PaqueteLineaDTO {

    private Long id;
    private String barcode;
    private String sku;
    private String nombre;
    private Integer precioCompra;
    private Integer precioVenta;
    private Integer stock;
    private String marcaTexto;
    private String categoriaTexto;
    private String imagenUrl;
    private String estado;
    private Long productoId;
    private String notasConflicto;
    private LocalDateTime fechaCreacion;

    public static PaqueteLineaDTO from(PaqueteLinea l) {
        PaqueteLineaDTO dto = new PaqueteLineaDTO();
        dto.id = l.getId();
        dto.barcode = l.getBarcode();
        dto.sku = l.getSku();
        dto.nombre = l.getNombre();
        dto.precioCompra = l.getPrecioCompra();
        dto.precioVenta = l.getPrecioVenta();
        dto.stock = l.getStock();
        dto.marcaTexto = l.getMarcaTexto();
        dto.categoriaTexto = l.getCategoriaTexto();
        dto.imagenUrl = l.getImagenUrl();
        dto.estado = l.getEstado();
        dto.productoId = l.getProductoId();
        dto.notasConflicto = l.getNotasConflicto();
        dto.fechaCreacion = l.getFechaCreacion();
        return dto;
    }

    public Long getId() { return id; }
    public String getBarcode() { return barcode; }
    public String getSku() { return sku; }
    public String getNombre() { return nombre; }
    public Integer getPrecioCompra() { return precioCompra; }
    public Integer getPrecioVenta() { return precioVenta; }
    public Integer getStock() { return stock; }
    public String getMarcaTexto() { return marcaTexto; }
    public String getCategoriaTexto() { return categoriaTexto; }
    public String getImagenUrl() { return imagenUrl; }
    public String getEstado() { return estado; }
    public Long getProductoId() { return productoId; }
    public String getNotasConflicto() { return notasConflicto; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
