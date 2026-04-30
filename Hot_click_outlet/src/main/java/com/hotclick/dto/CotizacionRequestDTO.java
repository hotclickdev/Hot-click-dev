package com.hotclick.dto;

import java.util.List;

public class CotizacionRequestDTO {

    private String nombreCliente;
    private String telefono;
    private List<ItemDTO> items;

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public List<ItemDTO> getItems() { return items; }
    public void setItems(List<ItemDTO> items) { this.items = items; }

    public static class ItemDTO {
        private Long id;
        private String nombre;
        private Integer cantidad;
        private Integer precio;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

        public Integer getPrecio() { return precio; }
        public void setPrecio(Integer precio) { this.precio = precio; }
    }
}
