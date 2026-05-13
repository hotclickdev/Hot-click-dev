package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_publicacion_fb_tb")
public class PublicacionFacebook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_publicacion_fb")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    // PENDIENTE, LISTO, PUBLICADO, ERROR
    @Column(name = "estado_publicacion", nullable = false, length = 20)
    private String estadoPublicacion = "PENDIENTE";

    @Column(name = "texto_fb", columnDefinition = "TEXT")
    private String textoFb;

    @Column(name = "titulo_fb", length = 255)
    private String tituloFb;

    @Column(name = "precio_publicar")
    private Integer precioPublicar;

    @Column(name = "categoria_fb", length = 100)
    private String categoriaFb;

    @Column(name = "condicion_fb", length = 50)
    private String condicionFb;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "fecha_publicacion")
    private LocalDateTime fechaPublicacion;

    @Column(name = "notas_admin", length = 500)
    private String notasAdmin;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public String getEstadoPublicacion() { return estadoPublicacion; }
    public void setEstadoPublicacion(String estadoPublicacion) { this.estadoPublicacion = estadoPublicacion; }
    public String getTextoFb() { return textoFb; }
    public void setTextoFb(String textoFb) { this.textoFb = textoFb; }
    public String getTituloFb() { return tituloFb; }
    public void setTituloFb(String tituloFb) { this.tituloFb = tituloFb; }
    public Integer getPrecioPublicar() { return precioPublicar; }
    public void setPrecioPublicar(Integer precioPublicar) { this.precioPublicar = precioPublicar; }
    public String getCategoriaFb() { return categoriaFb; }
    public void setCategoriaFb(String categoriaFb) { this.categoriaFb = categoriaFb; }
    public String getCondicionFb() { return condicionFb; }
    public void setCondicionFb(String condicionFb) { this.condicionFb = condicionFb; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaPublicacion() { return fechaPublicacion; }
    public void setFechaPublicacion(LocalDateTime fechaPublicacion) { this.fechaPublicacion = fechaPublicacion; }
    public String getNotasAdmin() { return notasAdmin; }
    public void setNotasAdmin(String notasAdmin) { this.notasAdmin = notasAdmin; }
}
