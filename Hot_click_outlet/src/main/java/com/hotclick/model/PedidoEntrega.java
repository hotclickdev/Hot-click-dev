package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Ubicación de entrega estructurada de un pedido a domicilio (satélite; no reemplaza direccion_entrega). */
@Entity
@Table(name = "hot_click_pedido_entrega_tb")
public class PedidoEntrega {

    public static final String TEXTO = "TEXTO";
    public static final String GOOGLE_MAPS = "GOOGLE_MAPS";
    public static final String WAZE = "WAZE";
    public static final String TELEGRAM = "TELEGRAM";
    public static final String WHATSAPP = "WHATSAPP";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_entrega")
    private Long id;

    @Column(name = "fk_id_pedido", nullable = false, unique = true)
    private Long pedidoId;

    @Column(name = "fuente", nullable = false, length = 20)
    private String fuente;

    @Column(name = "direccion_texto", length = 500)
    private String direccionTexto;

    @Column(name = "url_normalizada", length = 500)
    private String urlNormalizada;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    public Long getId() { return id; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
    public String getFuente() { return fuente; }
    public void setFuente(String fuente) { this.fuente = fuente; }
    public String getDireccionTexto() { return direccionTexto; }
    public void setDireccionTexto(String direccionTexto) { this.direccionTexto = direccionTexto; }
    public String getUrlNormalizada() { return urlNormalizada; }
    public void setUrlNormalizada(String urlNormalizada) { this.urlNormalizada = urlNormalizada; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
