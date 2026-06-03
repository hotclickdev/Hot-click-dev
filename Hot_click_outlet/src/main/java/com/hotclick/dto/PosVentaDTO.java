package com.hotclick.dto;

import java.util.List;

public class PosVentaDTO {

    private Long    clienteId;
    private Long    bodegaId;
    private String  metodoPago;
    private Integer montoRecibido;
    private String  confirmacionSinpe;
    private Integer descuentoGlobal;
    private String  notas;
    private List<Item> items;

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public Long getBodegaId() { return bodegaId; }
    public void setBodegaId(Long bodegaId) { this.bodegaId = bodegaId; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public Integer getMontoRecibido() { return montoRecibido; }
    public void setMontoRecibido(Integer montoRecibido) { this.montoRecibido = montoRecibido; }

    public String getConfirmacionSinpe() { return confirmacionSinpe; }
    public void setConfirmacionSinpe(String confirmacionSinpe) { this.confirmacionSinpe = confirmacionSinpe; }

    public Integer getDescuentoGlobal() { return descuentoGlobal; }
    public void setDescuentoGlobal(Integer descuentoGlobal) { this.descuentoGlobal = descuentoGlobal; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }

    public static class Item {
        private Long    productoId;
        private Integer cantidad;
        private Integer precioUnitario;

        public Long getProductoId() { return productoId; }
        public void setProductoId(Long productoId) { this.productoId = productoId; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

        public Integer getPrecioUnitario() { return precioUnitario; }
        public void setPrecioUnitario(Integer precioUnitario) { this.precioUnitario = precioUnitario; }
    }
}
