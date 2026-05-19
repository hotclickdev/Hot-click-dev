package com.hotclick.dto;

import java.util.List;

public class CarritoAbandonadoRequestDTO {

    private List<CartItemDTO> items;
    private String email;
    private String sessionId;

    public List<CartItemDTO> getItems()             { return items; }
    public void setItems(List<CartItemDTO> items)   { this.items = items; }

    public String getEmail()                        { return email; }
    public void setEmail(String email)              { this.email = email; }

    public String getSessionId()                    { return sessionId; }
    public void setSessionId(String sessionId)      { this.sessionId = sessionId; }

    public static class CartItemDTO {
        private Long productoId;
        private Integer cantidad;
        private Integer precio;
        private String nombre;
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
