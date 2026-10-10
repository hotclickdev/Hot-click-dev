package com.hotclick.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public class StorefrontPedidoDTO {

    /** Valor de metodoEnvio en la tienda pública (distinto de ENVIO_A_DOMICILIO del marketplace). */
    public static final String ENVIO_DOMICILIO = "DOMICILIO";
    public static final String ENVIO_RETIRO = "RETIRO";
    /** Mínimo de dígitos para contactar al comprador (CR: 8 locales). */
    public static final int TELEFONO_MIN_DIGITOS = 8;

    @NotBlank(message = "El nombre del cliente es requerido")
    @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
    private String nombreCliente;

    @Email(message = "Correo inválido")
    @NotBlank(message = "El correo es requerido")
    private String correoCliente;

    @NotBlank(message = "El teléfono de contacto es requerido")
    @Size(max = 30, message = "El teléfono no puede superar 30 caracteres")
    private String telefonoCliente;

    @Size(max = 500, message = "La dirección no puede superar 500 caracteres")
    private String direccionEntrega;

    /** SINPE_MOVIL | EFECTIVO | TRANSFERENCIA */
    @NotBlank(message = "Método de pago requerido")
    @Pattern(regexp = "(?i)SINPE_MOVIL|EFECTIVO|TRANSFERENCIA", message = "Método de pago no válido")
    private String metodoPago;

    /** DOMICILIO | RETIRO */
    @NotBlank(message = "Método de envío requerido")
    @Pattern(regexp = "(?i)DOMICILIO|RETIRO", message = "Método de envío no válido")
    private String metodoEnvio;

    @Size(max = 1000, message = "Las notas no pueden superar 1000 caracteres")
    private String notas;

    @NotEmpty(message = "El pedido debe tener al menos un producto")
    @Size(max = 50, message = "El pedido no puede tener más de 50 productos distintos")
    private List<@jakarta.validation.Valid ItemDTO> items;

    public record ItemDTO(
            @NotNull Long productoId,
            @Positive @jakarta.validation.constraints.Max(999) int cantidad
    ) {}

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String v) { this.nombreCliente = v; }

    public String getCorreoCliente() { return correoCliente; }
    public void setCorreoCliente(String v) { this.correoCliente = v; }

    public String getTelefonoCliente() { return telefonoCliente; }
    public void setTelefonoCliente(String v) { this.telefonoCliente = v; }

    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String v) { this.direccionEntrega = v; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String v) { this.metodoPago = v; }

    public String getMetodoEnvio() { return metodoEnvio; }
    public void setMetodoEnvio(String v) { this.metodoEnvio = v; }

    public String getNotas() { return notas; }
    public void setNotas(String v) { this.notas = v; }

    public List<ItemDTO> getItems() { return items; }
    public void setItems(List<ItemDTO> v) { this.items = v; }

    @AssertTrue(message = "La dirección de entrega es requerida para envío a domicilio")
    public boolean isDireccionPresenteCuandoDomicilio() {
        if (!ENVIO_DOMICILIO.equalsIgnoreCase(metodoEnvio)) {
            return true;
        }
        return direccionEntrega != null && !direccionEntrega.isBlank();
    }

    @AssertTrue(message = "El teléfono de contacto debe tener al menos " + TELEFONO_MIN_DIGITOS + " dígitos")
    public boolean isTelefonoContactoValido() {
        String digits = telefonoCliente == null ? "" : telefonoCliente.replaceAll("\\D", "");
        return digits.length() >= TELEFONO_MIN_DIGITOS;
    }
}
