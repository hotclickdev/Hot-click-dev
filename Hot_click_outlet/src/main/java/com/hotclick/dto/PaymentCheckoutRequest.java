package com.hotclick.dto;

import java.util.List;

public class PaymentCheckoutRequest {

    private Long bodegaId;
    private String metodoEnvio;
    private String notas;
    private List<ItemDTO> items;
    /** Proveedor de pago: "PAYXPERT" (default) o "PAYPAL". */
    private String provider;

    public Long getBodegaId() { return bodegaId; }
    public void setBodegaId(Long bodegaId) { this.bodegaId = bodegaId; }

    public String getMetodoEnvio() { return metodoEnvio; }
    public void setMetodoEnvio(String metodoEnvio) { this.metodoEnvio = metodoEnvio; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public List<ItemDTO> getItems() { return items; }
    public void setItems(List<ItemDTO> items) { this.items = items; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public static class ItemDTO {
        private Long productoId;
        private Integer cantidad;

        public Long getProductoId() { return productoId; }
        public void setProductoId(Long productoId) { this.productoId = productoId; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    }
}
