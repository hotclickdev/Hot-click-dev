package com.hotclick.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    /** Proveedor de pago: "STRIPE" (default) o "SINPE". */
    private String provider;

    /** Correo del comprador invitado (no autenticado). */
    private String guestEmail;

    /** Teléfono del comprador invitado (opcional). */
    private String guestPhone;

    /** Código de cupón de descuento (opcional). */
    private String codigoCupon;

    /** Código de gift card (opcional). Solo para usuarios autenticados. */
    private String codigoGiftCard;

    /** Dirección de entrega (señas, cantón, provincia). Solo se guarda en paquetes con envío. */
    @jakarta.validation.constraints.Size(max = 500, message = "La dirección es demasiado larga")
    private String direccionEntrega;

    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String direccionEntrega) { this.direccionEntrega = direccionEntrega; }

    /** Token del QR del POS — al confirmar el pago marca la sesión del cajero. */
    private String posQrToken;

    /** First/last touch UTM + _fbp/_fbc para atribución y CAPI. */
    private AtribucionSnapshotDTO atribucion;

    /**
     * Entrega elegida por paquete (una bodega de origen = un paquete). Sin esta lista,
     * todos los paquetes usan {@code metodoEnvio}.
     */
    @Valid
    private List<EnvioPaqueteDTO> envios;

    public List<EnvioPaqueteDTO> getEnvios() { return envios; }
    public void setEnvios(List<EnvioPaqueteDTO> envios) { this.envios = envios; }

    public static class EnvioPaqueteDTO {
        @NotNull(message = "La bodega del paquete es requerida")
        private Long bodegaId;

        @NotBlank(message = "El método de envío del paquete es requerido")
        private String metodoEnvio;

        /** Nota para la tienda de este paquete (opcional). */
        private String notas;

        public Long getBodegaId() { return bodegaId; }
        public void setBodegaId(Long bodegaId) { this.bodegaId = bodegaId; }

        public String getMetodoEnvio() { return metodoEnvio; }
        public void setMetodoEnvio(String metodoEnvio) { this.metodoEnvio = metodoEnvio; }

        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }
    }

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

    public String getPosQrToken() { return posQrToken; }
    public void setPosQrToken(String posQrToken) { this.posQrToken = posQrToken; }

    public AtribucionSnapshotDTO getAtribucion() { return atribucion; }
    public void setAtribucion(AtribucionSnapshotDTO atribucion) { this.atribucion = atribucion; }

    public static class ItemDTO {

        @NotNull(message = "El ID de producto es requerido")
        private Long productoId;

        @NotNull(message = "La cantidad es requerida")
        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        private Integer cantidad;

        /**
         * Precio unitario forzado, solo para uso interno (encargo cotizado, asignado en Java).
         * Ignorado en el JSON de entrada: si no, un checkout público podría fijar su propio precio.
         */
        @JsonIgnore
        private Integer precioUnitarioOverride;

        private PersonalizacionDTO personalizacion;

        public Long getProductoId() { return productoId; }
        public void setProductoId(Long productoId) { this.productoId = productoId; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

        public Integer getPrecioUnitarioOverride() { return precioUnitarioOverride; }
        public void setPrecioUnitarioOverride(Integer precioUnitarioOverride) {
            this.precioUnitarioOverride = precioUnitarioOverride;
        }

        public PersonalizacionDTO getPersonalizacion() { return personalizacion; }
        public void setPersonalizacion(PersonalizacionDTO personalizacion) {
            this.personalizacion = personalizacion;
        }
    }

    public static class PersonalizacionDTO {
        private java.util.List<String> imagenes;
        private String notas;
        private String tallaSeleccionada;
        /** Si viene de un encargo ya creado (cotización), enlaza el pedido al token. */
        private String encargoToken;

        public java.util.List<String> getImagenes() { return imagenes; }
        public void setImagenes(java.util.List<String> imagenes) { this.imagenes = imagenes; }

        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }

        public String getTallaSeleccionada() { return tallaSeleccionada; }
        public void setTallaSeleccionada(String tallaSeleccionada) { this.tallaSeleccionada = tallaSeleccionada; }

        public String getEncargoToken() { return encargoToken; }
        public void setEncargoToken(String encargoToken) { this.encargoToken = encargoToken; }
    }
}
