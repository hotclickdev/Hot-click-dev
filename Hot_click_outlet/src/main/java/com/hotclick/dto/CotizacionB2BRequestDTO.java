package com.hotclick.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public class CotizacionB2BRequestDTO {

    @NotNull(message = "El cliente es obligatorio")
    private Long clienteId;

    private LocalDate fechaEmision;
    private LocalDate fechaVencimiento;
    private String estadoCotizacion;
    private Boolean aplicaIva = false;
    private Integer porcentajeIva = 13;
    private String observaciones;
    private String terminos;
    private String moneda = "CRC";

    @NotEmpty(message = "Debe agregar al menos un producto")
    @Valid
    private List<ItemDTO> items;

    // ── Item DTO ─────────────────────────────────────────────────────────────────

    public static class ItemDTO {
        private String tipo = "CATALOGO"; // CATALOGO | TEMPORAL
        private Long productoId;

        @Size(max = 50)
        private String codigo;

        @NotBlank
        @Size(max = 200)
        private String nombre;

        private String descripcion;
        private String imagenUrl;

        @NotNull
        private Integer cantidad = 1;

        private String unidadMedida = "UNIDAD";

        @NotNull
        private Integer precioUnitario = 0;

        private Integer descuentoPorcentaje = 0;
        private Integer orden = 0;

        // Anotación inline para @NotBlank dentro del static class
        @interface NotBlank { String message() default "El nombre del ítem es obligatorio"; }

        public String getTipo() { return tipo; }
        public void setTipo(String tipo) { this.tipo = tipo; }

        public Long getProductoId() { return productoId; }
        public void setProductoId(Long productoId) { this.productoId = productoId; }

        public String getCodigo() { return codigo; }
        public void setCodigo(String codigo) { this.codigo = codigo; }

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

        public String getImagenUrl() { return imagenUrl; }
        public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

        public String getUnidadMedida() { return unidadMedida; }
        public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }

        public Integer getPrecioUnitario() { return precioUnitario; }
        public void setPrecioUnitario(Integer precioUnitario) { this.precioUnitario = precioUnitario; }

        public Integer getDescuentoPorcentaje() { return descuentoPorcentaje; }
        public void setDescuentoPorcentaje(Integer descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }

        public Integer getOrden() { return orden; }
        public void setOrden(Integer orden) { this.orden = orden; }
    }

    // ── Getters / Setters ────────────────────────────────────────────────────────

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public LocalDate getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDate fechaEmision) { this.fechaEmision = fechaEmision; }

    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

    public String getEstadoCotizacion() { return estadoCotizacion; }
    public void setEstadoCotizacion(String estadoCotizacion) { this.estadoCotizacion = estadoCotizacion; }

    public Boolean getAplicaIva() { return aplicaIva; }
    public void setAplicaIva(Boolean aplicaIva) { this.aplicaIva = aplicaIva; }

    public Integer getPorcentajeIva() { return porcentajeIva; }
    public void setPorcentajeIva(Integer porcentajeIva) { this.porcentajeIva = porcentajeIva; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public String getTerminos() { return terminos; }
    public void setTerminos(String terminos) { this.terminos = terminos; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public List<ItemDTO> getItems() { return items; }
    public void setItems(List<ItemDTO> items) { this.items = items; }
}
