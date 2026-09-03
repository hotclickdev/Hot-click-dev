package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_solicitud_recoleccion_tb")
public class SolicitudRecoleccion {

    public static final String ESTADO_PENDIENTE = "PENDIENTE";
    public static final String ESTADO_COTIZADA = "COTIZADA";
    public static final String ESTADO_RECHAZADA = "RECHAZADA";
    public static final String ESTADO_CANCELADA = "CANCELADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud_recoleccion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario")
    private Usuario usuario;

    @Column(name = "zona", nullable = false, length = 20)
    private String zona;

    @Column(name = "direccion_recoleccion", nullable = false, columnDefinition = "TEXT")
    private String direccionRecoleccion;

    @Column(name = "contacto_recoleccion", nullable = false, length = 120)
    private String contactoRecoleccion;

    @Column(name = "telefono_recoleccion", nullable = false, length = 30)
    private String telefonoRecoleccion;

    @Column(name = "direccion_entrega", nullable = false, columnDefinition = "TEXT")
    private String direccionEntrega;

    @Column(name = "contacto_entrega", nullable = false, length = 120)
    private String contactoEntrega;

    @Column(name = "telefono_entrega", nullable = false, length = 30)
    private String telefonoEntrega;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = ESTADO_PENDIENTE;

    @Column(name = "tarifa_colones")
    private Integer tarifaColones;

    @Column(name = "notas_admin", columnDefinition = "TEXT")
    private String notasAdmin;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_cotizacion")
    private LocalDateTime fechaCotizacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public String getZona() { return zona; }
    public void setZona(String zona) { this.zona = zona; }

    public String getDireccionRecoleccion() { return direccionRecoleccion; }
    public void setDireccionRecoleccion(String direccionRecoleccion) {
        this.direccionRecoleccion = direccionRecoleccion;
    }

    public String getContactoRecoleccion() { return contactoRecoleccion; }
    public void setContactoRecoleccion(String contactoRecoleccion) {
        this.contactoRecoleccion = contactoRecoleccion;
    }

    public String getTelefonoRecoleccion() { return telefonoRecoleccion; }
    public void setTelefonoRecoleccion(String telefonoRecoleccion) {
        this.telefonoRecoleccion = telefonoRecoleccion;
    }

    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String direccionEntrega) {
        this.direccionEntrega = direccionEntrega;
    }

    public String getContactoEntrega() { return contactoEntrega; }
    public void setContactoEntrega(String contactoEntrega) {
        this.contactoEntrega = contactoEntrega;
    }

    public String getTelefonoEntrega() { return telefonoEntrega; }
    public void setTelefonoEntrega(String telefonoEntrega) {
        this.telefonoEntrega = telefonoEntrega;
    }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Integer getTarifaColones() { return tarifaColones; }
    public void setTarifaColones(Integer tarifaColones) { this.tarifaColones = tarifaColones; }

    public String getNotasAdmin() { return notasAdmin; }
    public void setNotasAdmin(String notasAdmin) { this.notasAdmin = notasAdmin; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaCotizacion() { return fechaCotizacion; }
    public void setFechaCotizacion(LocalDateTime fechaCotizacion) { this.fechaCotizacion = fechaCotizacion; }
}
