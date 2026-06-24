package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_solicitud_aprobacion_tb")
public class SolicitudAprobacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud")
    private Long id;

    @Column(name = "tipo_entidad", nullable = false, length = 50)
    private String tipoEntidad;  // PRODUCTO, MARCA, CATEGORIA, BODEGA, USUARIO, WEBHOOK

    @Column(name = "accion_solicitada", nullable = false, length = 20)
    private String accionSolicitada;  // DELETE, UPDATE_SENSIBLE, PUBLISH

    @Column(name = "id_entidad", nullable = false)
    private Long idEntidad;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "datos_snapshot", columnDefinition = "jsonb")
    private String datosSnapshot;

    @Column(name = "motivo_solicitud", columnDefinition = "TEXT")
    private String motivoSolicitud;

    @Column(name = "estado_solicitud", nullable = false, length = 20)
    private String estadoSolicitud = "PENDIENTE";  // PENDIENTE, APROBADO, RECHAZADO

    @Column(name = "comentario_revisor", columnDefinition = "TEXT")
    private String comentarioRevisor;

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDateTime fechaSolicitud = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario_pide", nullable = false)
    private Usuario usuarioPide;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario_resuelve")
    private Usuario usuarioResuelve;

    @Column(name = "fk_id_estado", nullable = false)
    private Integer estado = 1;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTipoEntidad() { return tipoEntidad; }
    public void setTipoEntidad(String tipoEntidad) { this.tipoEntidad = tipoEntidad; }

    public String getAccionSolicitada() { return accionSolicitada; }
    public void setAccionSolicitada(String accionSolicitada) { this.accionSolicitada = accionSolicitada; }

    public Long getIdEntidad() { return idEntidad; }
    public void setIdEntidad(Long idEntidad) { this.idEntidad = idEntidad; }

    public String getDatosSnapshot() { return datosSnapshot; }
    public void setDatosSnapshot(String datosSnapshot) { this.datosSnapshot = datosSnapshot; }

    public String getMotivoPeticion() { return motivoSolicitud; }
    public void setMotivoPeticion(String motivoSolicitud) { this.motivoSolicitud = motivoSolicitud; }

    public String getEstadoSolicitud() { return estadoSolicitud; }
    public void setEstadoSolicitud(String estadoSolicitud) { this.estadoSolicitud = estadoSolicitud; }

    public String getComentarioRevisor() { return comentarioRevisor; }
    public void setComentarioRevisor(String comentarioRevisor) { this.comentarioRevisor = comentarioRevisor; }

    public LocalDateTime getFechaSolicitud() { return fechaSolicitud; }
    public void setFechaSolicitud(LocalDateTime fechaSolicitud) { this.fechaSolicitud = fechaSolicitud; }

    public LocalDateTime getFechaResolucion() { return fechaResolucion; }
    public void setFechaResolucion(LocalDateTime fechaResolucion) { this.fechaResolucion = fechaResolucion; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Usuario getUsuarioPide() { return usuarioPide; }
    public void setUsuarioPide(Usuario usuarioPide) { this.usuarioPide = usuarioPide; }

    public Usuario getUsuarioResuelve() { return usuarioResuelve; }
    public void setUsuarioResuelve(Usuario usuarioResuelve) { this.usuarioResuelve = usuarioResuelve; }

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }
}
