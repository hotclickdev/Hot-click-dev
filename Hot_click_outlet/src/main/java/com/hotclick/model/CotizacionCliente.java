package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_cotizacion_cliente_tb")
public class CotizacionCliente extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id")
    private Empresa empresa;

    @Column(name = "nombre_comercial", nullable = false, length = 200)
    private String nombreComercial;

    @Column(name = "razon_social", length = 200)
    private String razonSocial;

    @Column(name = "cedula_juridica", length = 20)
    private String cedulaJuridica;

    @Column(name = "correo", length = 150)
    private String correo;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "direccion", columnDefinition = "text")
    private String direccion;

    @Column(name = "contacto_principal", length = 150)
    private String contactoPrincipal;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @PrePersist
    void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() { fechaActualizacion = LocalDateTime.now(); }

    // ── Getters / Setters ────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getNombreComercial() { return nombreComercial; }
    public void setNombreComercial(String v) { this.nombreComercial = v; }

    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String v) { this.razonSocial = v; }

    public String getCedulaJuridica() { return cedulaJuridica; }
    public void setCedulaJuridica(String v) { this.cedulaJuridica = v; }

    public String getCorreo() { return correo; }
    public void setCorreo(String v) { this.correo = v; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String v) { this.telefono = v; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String v) { this.direccion = v; }

    public String getContactoPrincipal() { return contactoPrincipal; }
    public void setContactoPrincipal(String v) { this.contactoPrincipal = v; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
}
