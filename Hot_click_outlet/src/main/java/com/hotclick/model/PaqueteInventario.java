package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hotclick.utils.Constants;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_paquete_inventario_tb")
public class PaqueteInventario {

    public static final String ESTADO_ABIERTO = "ABIERTO";
    public static final String ESTADO_CERRADO = "CERRADO";
    public static final String ESTADO_ASIGNADO = "ASIGNADO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_paquete")
    private Long id;

    @Column(name = "codigo", nullable = false, length = 40, unique = true)
    private String codigo;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @Column(name = "nombre_negocio_temporal", length = 200)
    private String nombreNegocioTemporal;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = ESTADO_ABIERTO;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_creado_por")
    private Usuario creadoPor;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "fecha_asignacion")
    private LocalDateTime fechaAsignacion;

    @OneToMany(mappedBy = "paquete", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<PaqueteLinea> lineas = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);
        }
        if (estado == null) {
            estado = ESTADO_ABIERTO;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Long getEmpresaId() { return empresa != null ? empresa.getId() : null; }
    public String getNombreNegocioTemporal() { return nombreNegocioTemporal; }
    public void setNombreNegocioTemporal(String v) { this.nombreNegocioTemporal = v; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public Usuario getCreadoPor() { return creadoPor; }
    public void setCreadoPor(Usuario creadoPor) { this.creadoPor = creadoPor; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime v) { this.fechaCreacion = v; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime v) { this.fechaCierre = v; }
    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime v) { this.fechaAsignacion = v; }
    public List<PaqueteLinea> getLineas() { return lineas; }
    public void setLineas(List<PaqueteLinea> lineas) { this.lineas = lineas; }
}
