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

    /** Correo del comprador invitado (no autenticado). */
    private String guestEmail;

    /** Teléfono del comprador invitado (opcional). */
    private String guestPhone;

    /** Código de cupón de descuento (opcional). */
    private String codigoCupon;

    /** Código de gift card (opcional). Solo para usuarios autenticados. */
    private String codigoGiftCard;

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

    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public String getCodigoCupon() { return codigoCupon; }
    public void setCodigoCupon(String codigoCupon) { this.codigoCupon = codigoCupon; }

    public String getCodigoGiftCard() { return codigoGiftCard; }
    public void setCodigoGiftCard(String codigoGiftCard) { this.codigoGiftCard = codigoGiftCard; }

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
