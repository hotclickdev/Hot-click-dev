package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_plugin_tb")
public class Plugin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plugin")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    /** WEBHOOK | IFRAME */
    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo = "WEBHOOK";

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    /** JSON array of event names e.g. ["pedido.creado","pedido.pagado"] */
    @Column(name = "eventos_suscritos", columnDefinition = "text")
    private String eventosSuscritos = "[]";

    @Column(name = "secreto_hmac", length = 100)
    private String secretoHmac;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @PrePersist
    void onCreate() {
        fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getEventosSuscritos() { return eventosSuscritos; }
    public void setEventosSuscritos(String eventosSuscritos) { this.eventosSuscritos = eventosSuscritos; }

    public String getSecretoHmac() { return secretoHmac; }
    public void setSecretoHmac(String secretoHmac) { this.secretoHmac = secretoHmac; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
