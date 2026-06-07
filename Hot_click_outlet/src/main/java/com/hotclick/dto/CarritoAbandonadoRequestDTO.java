package com.hotclick.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CarritoAbandonadoRequestDTO {

    @Valid
    private List<CartItemDTO> items;

    @Email(message = "Correo inválido")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres")
    private String email;

    @Size(max = 100, message = "El sessionId no puede superar 100 caracteres")
    private String sessionId;

    public List<CartItemDTO> getItems()             { return items; }
    public void setItems(List<CartItemDTO> items)   { this.items = items; }
    public String getEmail()                        { return email; }
    public void setEmail(String email)              { this.email = email; }
    public String getSessionId()                    { return sessionId; }
    public void setSessionId(String sessionId)      { this.sessionId = sessionId; }

    public static class CartItemDTO {

        @NotNull(message = "El ID de producto es obligatorio")
        @Min(value = 1, message = "El ID de producto debe ser mayor a 0")
        private Long productoId;

        @NotNull(message = "La cantidad es obligatoria")
        @Min(value = 1, message = "La cantidad mínima es 1")
        private Integer cantidad;

        @Min(value = 0, message = "El precio no puede ser negativo")
        private Integer precio;

        @Size(max = 200, message = "El nombre no puede superar 200 caracteres")
        private String nombre;

        @Size(max = 1000, message = "La URL de imagen no puede superar 1000 caracteres")
        private String imagenUrl;

        public Long getProductoId()                 { return productoId; }
        public void setProductoId(Long productoId)  { this.productoId = productoId; }
        public Integer getCantidad()                { return cantidad; }
        public void setCantidad(Integer cantidad)   { this.cantidad = cantidad; }
        public Integer getPrecio()                  { return precio; }
        public void setPrecio(Integer precio)       { this.precio = precio; }
        public String getNombre()                   { return nombre; }
        public void setNombre(String nombre)        { this.nombre = nombre; }
        public String getImagenUrl()                { return imagenUrl; }
        public void setImagenUrl(String imagenUrl)  { this.imagenUrl = imagenUrl; }
    }
}
