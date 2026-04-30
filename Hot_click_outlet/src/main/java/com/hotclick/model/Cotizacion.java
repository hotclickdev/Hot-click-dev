package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_cotizacion_tb")
public class Cotizacion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cotizacion")
    private Long id;

    @Column(name = "nombre_cliente", length = 200)
    private String nombreCliente;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "productos", nullable = false, columnDefinition = "text")
    private String productosJson;

    @Column(name = "total", nullable = false)
    private Integer total;

    @Column(name = "mensaje_enviado", columnDefinition = "text")
    private String mensajeEnviado;

    @Column(name = "fecha_cotizacion")
    private LocalDateTime fechaCotizacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getProductosJson() { return productosJson; }
    public void setProductosJson(String productosJson) { this.productosJson = productosJson; }

    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }

    public String getMensajeEnviado() { return mensajeEnviado; }
    public void setMensajeEnviado(String mensajeEnviado) { this.mensajeEnviado = mensajeEnviado; }

    public LocalDateTime getFechaCotizacion() { return fechaCotizacion; }
    public void setFechaCotizacion(LocalDateTime fechaCotizacion) { this.fechaCotizacion = fechaCotizacion; }
}
