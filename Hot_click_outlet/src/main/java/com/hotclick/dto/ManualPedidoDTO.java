package com.hotclick.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ManualPedidoDTO {

    @NotNull(message = "El usuario es requerido")
    private Long usuarioId;

    @NotNull(message = "La bodega es requerida")
    private Long bodegaId;

    @NotBlank(message = "El método de envío es requerido")
    private String metodoEnvio;

    @NotBlank(message = "El método de pago es requerido")
    private String metodoPago;

    private Integer costoEnvio;
    private String estadoPedido;
    private String notas;

    @NotEmpty(message = "El pedido debe tener al menos un producto")
    @Valid
    private List<ItemDTO> items;

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public Long getBodegaId() { return bodegaId; }
    public void setBodegaId(Long bodegaId) { this.bodegaId = bodegaId; }

    public String getMetodoEnvio() { return metodoEnvio; }
    public void setMetodoEnvio(String metodoEnvio) { this.metodoEnvio = metodoEnvio; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public Integer getCostoEnvio() { return costoEnvio; }
    public void setCostoEnvio(Integer costoEnvio) { this.costoEnvio = costoEnvio; }

    public String getEstadoPedido() { return estadoPedido; }
    public void setEstadoPedido(String estadoPedido) { this.estadoPedido = estadoPedido; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public List<ItemDTO> getItems() { return items; }
    public void setItems(List<ItemDTO> items) { this.items = items; }

    private String origen;
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public static class ItemDTO {

        @NotNull(message = "El ID de producto es requerido")
        private Long productoId;

        @NotNull(message = "La cantidad es requerida")
        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        private Integer cantidad;

        @NotNull(message = "El precio unitario es requerido")
        @Min(value = 0, message = "El precio no puede ser negativo")
        private Integer precioUnitario;

        public Long getProductoId() { return productoId; }
        public void setProductoId(Long productoId) { this.productoId = productoId; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

        public Integer getPrecioUnitario() { return precioUnitario; }
        public void setPrecioUnitario(Integer precioUnitario) { this.precioUnitario = precioUnitario; }
    }
}
