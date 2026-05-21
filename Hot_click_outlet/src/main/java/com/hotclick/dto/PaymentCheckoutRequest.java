package com.hotclick.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class PaymentCheckoutRequest {

    @NotNull(message = "La bodega es requerida")
    private Long bodegaId;

    @NotBlank(message = "El método de envío es requerido")
    private String metodoEnvio;

    private String notas;

    @NotEmpty(message = "El carrito no puede estar vacío")
    @Valid
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

        @NotNull(message = "El ID de producto es requerido")
        private Long productoId;

        @NotNull(message = "La cantidad es requerida")
        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        private Integer cantidad;

        public Long getProductoId() { return productoId; }
        public void setProductoId(Long productoId) { this.productoId = productoId; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    }
}
