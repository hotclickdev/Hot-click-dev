package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_producto_imagen_tb")
public class ProductoImagen extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_imagen")
    private Long id;

    @Column(name = "url_imagen", nullable = false, length = 500)
    private String urlImagen;

    @Column(name = "public_id_cloudinary", length = 200)
    private String publicIdCloudinary;

    @Column(name = "posicion")
    private Integer posicion = 0;

    @Column(name = "es_principal")
    private Boolean esPrincipal = false;

    @Column(name = "alt_text", length = 200)
    private String altText;

    @ManyToOne
    @JoinColumn(name = "fk_id_producto", nullable = false)
    private Producto producto;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUrlImagen() { return urlImagen; }
    public void setUrlImagen(String urlImagen) { this.urlImagen = urlImagen; }

    public String getPublicIdCloudinary() { return publicIdCloudinary; }
    public void setPublicIdCloudinary(String publicIdCloudinary) { this.publicIdCloudinary = publicIdCloudinary; }

    public Integer getPosicion() { return posicion; }
    public void setPosicion(Integer posicion) { this.posicion = posicion; }

    public Boolean getEsPrincipal() { return esPrincipal; }
    public void setEsPrincipal(Boolean esPrincipal) { this.esPrincipal = esPrincipal; }

    public String getAltText() { return altText; }
    public void setAltText(String altText) { this.altText = altText; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
}
