package com.hotclick.dto;

import java.time.LocalDateTime;
import java.util.List;

public class DashboardDTO {

    private long totalUsuarios;
    private long totalProductos;
    private long totalPedidos;
    private long totalVentas;
    private long pedidosPendientes;
    private int productosBajoStock;
    private List<CategoriaConteoDTO> categorias;
    private UltimoPedidoDTO ultimoPedido;

    // ── Getters / Setters ──

    public long getTotalUsuarios() { return totalUsuarios; }
    public void setTotalUsuarios(long totalUsuarios) { this.totalUsuarios = totalUsuarios; }

    public long getTotalProductos() { return totalProductos; }
    public void setTotalProductos(long totalProductos) { this.totalProductos = totalProductos; }

    public long getTotalPedidos() { return totalPedidos; }
    public void setTotalPedidos(long totalPedidos) { this.totalPedidos = totalPedidos; }

    public long getTotalVentas() { return totalVentas; }
    public void setTotalVentas(long totalVentas) { this.totalVentas = totalVentas; }

    public long getPedidosPendientes() { return pedidosPendientes; }
    public void setPedidosPendientes(long pedidosPendientes) { this.pedidosPendientes = pedidosPendientes; }

    public int getProductosBajoStock() { return productosBajoStock; }
    public void setProductosBajoStock(int productosBajoStock) { this.productosBajoStock = productosBajoStock; }

    public List<CategoriaConteoDTO> getCategorias() { return categorias; }
    public void setCategorias(List<CategoriaConteoDTO> categorias) { this.categorias = categorias; }

    public UltimoPedidoDTO getUltimoPedido() { return ultimoPedido; }
    public void setUltimoPedido(UltimoPedidoDTO ultimoPedido) { this.ultimoPedido = ultimoPedido; }

    // ── Inner DTOs ──

    public static class CategoriaConteoDTO {
        private String nombre;
        private long cantidad;

        public CategoriaConteoDTO(String nombre, long cantidad) {
            this.nombre = nombre;
            this.cantidad = cantidad;
        }

        public String getNombre() { return nombre; }
        public long getCantidad() { return cantidad; }
    }

    public static class UltimoPedidoDTO {
        private String numeroPedido;
        private LocalDateTime fechaPedido;
        private String estadoPedido;
        private Integer totalPedido;
        private String clienteNombre;
        private String clienteCorreo;
        private List<ItemDTO> items;

        public String getNumeroPedido() { return numeroPedido; }
        public void setNumeroPedido(String numeroPedido) { this.numeroPedido = numeroPedido; }

        public LocalDateTime getFechaPedido() { return fechaPedido; }
        public void setFechaPedido(LocalDateTime fechaPedido) { this.fechaPedido = fechaPedido; }

        public String getEstadoPedido() { return estadoPedido; }
        public void setEstadoPedido(String estadoPedido) { this.estadoPedido = estadoPedido; }

        public Integer getTotalPedido() { return totalPedido; }
        public void setTotalPedido(Integer totalPedido) { this.totalPedido = totalPedido; }

        public String getClienteNombre() { return clienteNombre; }
        public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

        public String getClienteCorreo() { return clienteCorreo; }
        public void setClienteCorreo(String clienteCorreo) { this.clienteCorreo = clienteCorreo; }

        public List<ItemDTO> getItems() { return items; }
        public void setItems(List<ItemDTO> items) { this.items = items; }
    }

    public static class ItemDTO {
        private String nombreProducto;
        private Integer cantidad;
        private Integer precioUnitario;

        public ItemDTO(String nombreProducto, Integer cantidad, Integer precioUnitario) {
            this.nombreProducto = nombreProducto;
            this.cantidad = cantidad;
            this.precioUnitario = precioUnitario;
        }

        public String getNombreProducto() { return nombreProducto; }
        public Integer getCantidad() { return cantidad; }
        public Integer getPrecioUnitario() { return precioUnitario; }
    }
}
