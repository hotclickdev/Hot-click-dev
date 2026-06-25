package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_catalogo_maestro_tb")
public class CatalogoMaestro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_catalogo_maestro")
    private Long id;

    @Column(name = "nombre", nullable = false, length = 200)
    private String nombre;

    @Column(name = "descripcion_corta", length = 400)
    private String descripcionCorta;

    @Column(name = "descripcion_larga", columnDefinition = "TEXT")
    private String descripcionLarga;

    @Column(name = "imagen_principal_url", length = 500)
    private String imagenPrincipalUrl;

    /** URLs adicionales separadas por coma. */
    @Column(name = "imagenes_extra", columnDefinition = "TEXT")
    private String imagenesExtra;

    @Column(name = "sku_fabricante", length = 100)
    private String skuFabricante;

    @Column(name = "codigo_barras", length = 50)
    private String codigoBarras;

    @Column(name = "modelo", length = 100)
    private String modelo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_marca")
    private Marca marca;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_categoria")
    private Categoria categoria;

    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @PrePersist
    void onCreate() {
        fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);
        fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);
    }

    @PreUpdate
    void onUpdate() {
        fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcionCorta() { return descripcionCorta; }
    public void setDescripcionCorta(String v) { this.descripcionCorta = v; }
    public String getDescripcionLarga() { return descripcionLarga; }
    public void setDescripcionLarga(String v) { this.descripcionLarga = v; }
    public String getImagenPrincipalUrl() { return imagenPrincipalUrl; }
    public void setImagenPrincipalUrl(String v) { this.imagenPrincipalUrl = v; }
    public String getImagenesExtra() { return imagenesExtra; }
    public void setImagenesExtra(String v) { this.imagenesExtra = v; }
    public String getSkuFabricante() { return skuFabricante; }
    public void setSkuFabricante(String v) { this.skuFabricante = v; }
    public String getCodigoBarras() { return codigoBarras; }
    public void setCodigoBarras(String v) { this.codigoBarras = v; }
    public String getModelo() { return modelo; }
    public void setModelo(String v) { this.modelo = v; }
    public Marca getMarca() { return marca; }
    public void setMarca(Marca v) { this.marca = v; }
    public Long getMarcaId() { return marca != null ? marca.getId() : null; }
    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria v) { this.categoria = v; }
    public Long getCategoriaId() { return categoria != null ? categoria.getId() : null; }
    public String getTags() { return tags; }
    public void setTags(String v) { this.tags = v; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean v) { this.activo = v; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
}
