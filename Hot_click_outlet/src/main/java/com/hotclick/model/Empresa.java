package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_empresa_tb")
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empresa")
    private Long id;

    @Column(name = "nombre_empresa", nullable = false, length = 200)
    private String nombreEmpresa;

    @Column(name = "nombre_comercial", length = 200)
    private String nombreComercial;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "ruc_cedula", length = 30)
    private String rucCedula;

    @Column(name = "correo_empresa", nullable = false, unique = true, length = 150)
    private String correoEmpresa;

    @Column(name = "telefono_empresa", length = 30)
    private String telefonoEmpresa;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "color_primario", length = 7)
    private String colorPrimario = "#FF4B12";

    @Column(name = "color_secundario", length = 7)
    private String colorSecundario = "#1A1A2E";

    @Column(name = "moneda_defecto", length = 3)
    private String monedaDefecto = "CRC";

    @Column(name = "pais_operacion", length = 3)
    private String paisOperacion = "CRC";

    @Column(name = "plan_saas", nullable = false, length = 30)
    private String planSaas = "GRATUITO";

    @Column(name = "estado_empresa", nullable = false, length = 20)
    private String estadoEmpresa = "ACTIVO";

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_aprobacion")
    private LocalDateTime fechaAprobacion;

    @Column(name = "numero_whatsapp", length = 30)
    private String numeroWhatsapp;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "fk_id_estado", nullable = false)
    private Integer estado = 1;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreEmpresa() { return nombreEmpresa; }
    public void setNombreEmpresa(String nombreEmpresa) { this.nombreEmpresa = nombreEmpresa; }

    public String getNombreComercial() { return nombreComercial; }
    public void setNombreComercial(String nombreComercial) { this.nombreComercial = nombreComercial; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getRucCedula() { return rucCedula; }
    public void setRucCedula(String rucCedula) { this.rucCedula = rucCedula; }

    public String getCorreoEmpresa() { return correoEmpresa; }
    public void setCorreoEmpresa(String correoEmpresa) { this.correoEmpresa = correoEmpresa; }

    public String getTelefonoEmpresa() { return telefonoEmpresa; }
    public void setTelefonoEmpresa(String telefonoEmpresa) { this.telefonoEmpresa = telefonoEmpresa; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getColorPrimario() { return colorPrimario; }
    public void setColorPrimario(String colorPrimario) { this.colorPrimario = colorPrimario; }

    public String getColorSecundario() { return colorSecundario; }
    public void setColorSecundario(String colorSecundario) { this.colorSecundario = colorSecundario; }

    public String getMonedaDefecto() { return monedaDefecto; }
    public void setMonedaDefecto(String monedaDefecto) { this.monedaDefecto = monedaDefecto; }

    public String getPaisOperacion() { return paisOperacion; }
    public void setPaisOperacion(String paisOperacion) { this.paisOperacion = paisOperacion; }

    public String getPlanSaas() { return planSaas; }
    public void setPlanSaas(String planSaas) { this.planSaas = planSaas; }

    public String getEstadoEmpresa() { return estadoEmpresa; }
    public void setEstadoEmpresa(String estadoEmpresa) { this.estadoEmpresa = estadoEmpresa; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public LocalDateTime getFechaAprobacion() { return fechaAprobacion; }
    public void setFechaAprobacion(LocalDateTime fechaAprobacion) { this.fechaAprobacion = fechaAprobacion; }

    public String getNumeroWhatsapp() { return numeroWhatsapp; }
    public void setNumeroWhatsapp(String numeroWhatsapp) { this.numeroWhatsapp = numeroWhatsapp; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }
}
