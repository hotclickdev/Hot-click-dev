package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public class StorefrontPedidoDTO {

    @NotBlank(message = "El nombre del cliente es requerido")
    private String nombreCliente;

    @Email(message = "Correo inválido")
    @NotBlank(message = "El correo es requerido")
    private String correoCliente;

    private String telefonoCliente;

    private String direccionEntrega;

    /** SINPE_MOVIL | EFECTIVO | TRANSFERENCIA */
    @NotBlank(message = "Método de pago requerido")
    private String metodoPago;

    /** DOMICILIO | RETIRO */
    @NotBlank(message = "Método de envío requerido")
    private String metodoEnvio;

    private String notas;

    @NotEmpty(message = "El pedido debe tener al menos un producto")
    private List<ItemDTO> items;

    public record ItemDTO(
            @NotNull Long productoId,
            @Positive int cantidad
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
}
