package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_precio_sugerido_tb")
public class PrecioSugerido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_precio_sugerido")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto")
    private Producto producto;

    @Column(name = "fuente", nullable = false, length = 100)
    private String fuente;

    @Column(name = "url_fuente", length = 500)
    private String urlFuente;

    @Column(name = "precio_usd")
    private Integer precioUsd;

    @Column(name = "precio_crc")
    private Integer precioCrc;

    @Column(name = "tipo_cambio_usado")
    private Integer tipoCambioUsado;

    @Column(name = "precio_con_iva")
    private Integer precioConIva;

    @Column(name = "precio_con_importacion")
    private Integer precioConImportacion;

    @Column(name = "precio_sugerido_final")
    private Integer precioSugeridoFinal;

    @Column(name = "fecha_extraccion", nullable = false)
    private LocalDateTime fechaExtraccion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public String getFuente() { return fuente; }
    public void setFuente(String fuente) { this.fuente = fuente; }
    public String getUrlFuente() { return urlFuente; }
    public void setUrlFuente(String urlFuente) { this.urlFuente = urlFuente; }
    public Integer getPrecioUsd() { return precioUsd; }
    public void setPrecioUsd(Integer precioUsd) { this.precioUsd = precioUsd; }
    public Integer getPrecioCrc() { return precioCrc; }
    public void setPrecioCrc(Integer precioCrc) { this.precioCrc = precioCrc; }
    public Integer getTipoCambioUsado() { return tipoCambioUsado; }
    public void setTipoCambioUsado(Integer tipoCambioUsado) { this.tipoCambioUsado = tipoCambioUsado; }
    public Integer getPrecioConIva() { return precioConIva; }
    public void setPrecioConIva(Integer precioConIva) { this.precioConIva = precioConIva; }
    public Integer getPrecioConImportacion() { return precioConImportacion; }
    public void setPrecioConImportacion(Integer precioConImportacion) { this.precioConImportacion = precioConImportacion; }
    public Integer getPrecioSugeridoFinal() { return precioSugeridoFinal; }
    public void setPrecioSugeridoFinal(Integer precioSugeridoFinal) { this.precioSugeridoFinal = precioSugeridoFinal; }
    public LocalDateTime getFechaExtraccion() { return fechaExtraccion; }
    public void setFechaExtraccion(LocalDateTime fechaExtraccion) { this.fechaExtraccion = fechaExtraccion; }
}
