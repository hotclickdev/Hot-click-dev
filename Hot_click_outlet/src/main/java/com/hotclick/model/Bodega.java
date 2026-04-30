package com.hotclick.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "hot_click_bodega_tb")
public class Bodega extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bodega")
    private Long id;

    @Column(name = "nombre_bodega", nullable = false, length = 100)
    private String nombreBodega;

    @Column(name = "direccion_exacta", nullable = false)
    private String direccionExacta;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "correo_contacto", length = 100)
    private String correoContacto;

    @Column(name = "horario_apertura")
    private LocalTime horarioApertura;

    @Column(name = "horario_cierre")
    private LocalTime horarioCierre;

    @Column(name = "latitud", precision = 10, scale = 8)
    private BigDecimal latitud;

    @Column(name = "longitud", precision = 11, scale = 8)
    private BigDecimal longitud;

    @Column(name = "capacidad_maxima")
    private Integer capacidadMaxima;

    @Column(name = "encargado_nombre", length = 100)
    private String encargadoNombre;

    @ManyToOne
    @JoinColumn(name = "fk_id_admin_cliente", nullable = false)
    private Usuario adminCliente;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreBodega() { return nombreBodega; }
    public void setNombreBodega(String nombreBodega) { this.nombreBodega = nombreBodega; }

    public String getDireccionExacta() { return direccionExacta; }
    public void setDireccionExacta(String direccionExacta) { this.direccionExacta = direccionExacta; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getCorreoContacto() { return correoContacto; }
    public void setCorreoContacto(String correoContacto) { this.correoContacto = correoContacto; }

    public LocalTime getHorarioApertura() { return horarioApertura; }
    public void setHorarioApertura(LocalTime horarioApertura) { this.horarioApertura = horarioApertura; }

    public LocalTime getHorarioCierre() { return horarioCierre; }
    public void setHorarioCierre(LocalTime horarioCierre) { this.horarioCierre = horarioCierre; }

    public BigDecimal getLatitud() { return latitud; }
    public void setLatitud(BigDecimal latitud) { this.latitud = latitud; }

    public BigDecimal getLongitud() { return longitud; }
    public void setLongitud(BigDecimal longitud) { this.longitud = longitud; }

    public Integer getCapacidadMaxima() { return capacidadMaxima; }
    public void setCapacidadMaxima(Integer capacidadMaxima) { this.capacidadMaxima = capacidadMaxima; }

    public String getEncargadoNombre() { return encargadoNombre; }
    public void setEncargadoNombre(String encargadoNombre) { this.encargadoNombre = encargadoNombre; }

    public Usuario getAdminCliente() { return adminCliente; }
    public void setAdminCliente(Usuario adminCliente) { this.adminCliente = adminCliente; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
