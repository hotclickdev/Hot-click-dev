package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Factura que un negocio le emite a HotClick por una quincena (V262). La tabla guarda el monto que se le debe, el plazo,
 * el resultado de revisar el XML que subió y la aceptación (mensaje receptor). Nunca se expone la entidad: va por DTO.
 */
@Entity
@Table(name = "hot_click_factura_negocio_tb",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_factura_negocio_empresa_periodo", columnNames = {"fk_id_empresa", "periodo_desde", "periodo_hasta"}),
        @UniqueConstraint(name = "uq_factura_negocio_clave", columnNames = {"clave_xml"})},
    indexes = @Index(name = "idx_factura_negocio_estado_limite", columnList = "estado, fecha_limite"))
public class FacturaNegocio {

    public static final String PENDIENTE = "PENDIENTE";
    public static final String RECIBIDA = "RECIBIDA";
    public static final String ACEPTADA = "ACEPTADA";
    public static final String RECHAZADA = "RECHAZADA";
    public static final String VENCIDA = "VENCIDA";
    public static final String NO_APLICA = "NO_APLICA";


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_factura_negocio")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "periodo_desde", nullable = false)
    private LocalDate periodoDesde;

    @Column(name = "periodo_hasta", nullable = false)
    private LocalDate periodoHasta;

    @Column(name = "monto_crc", nullable = false)
    private long montoCrc;

    @Column(name = "fecha_limite", nullable = false)
    private LocalDate fechaLimite;

    @Column(name = "estado", nullable = false, length = 15)
    private String estado;

    @Column(name = "clave_xml", length = 50)
    private String claveXml;

    @Column(name = "cedula_emisor", length = 12)
    private String cedulaEmisor;

    @Column(name = "total_factura_crc")
    private Long totalFacturaCrc;

    @Column(name = "total_iva_crc")
    private Long totalIvaCrc;

    @Column(name = "xml_path", length = 500)
    private String xmlPath;

    @Column(name = "mensaje_validacion", length = 2000)
    private String mensajeValidacion;

    @Column(name = "revisada", nullable = false)
    private boolean revisada;

    @Column(name = "revisada_por")
    private Long revisadaPor;

    @Column(name = "fecha_revision")
    private LocalDateTime fechaRevision;

    @Column(name = "fecha_recibida")
    private LocalDateTime fechaRecibida;

    @Column(name = "desglose_json", columnDefinition = "text")
    private String desgloseJson;

    @Column(name = "ultimo_recordatorio")
    private LocalDateTime ultimoRecordatorio;

    @Column(name = "recordatorios", nullable = false)
    private int recordatorios;

    @Column(name = "mensaje_receptor_estado", length = 30)
    private String mensajeReceptorEstado;

    @Column(name = "mensaje_receptor_detalle", length = 500)
    private String mensajeReceptorDetalle;

    @Column(name = "mensaje_receptor_fecha")
    private LocalDateTime mensajeReceptorFecha;

    @Column(name = "fecha_limite_mensaje_receptor")
    private LocalDate fechaLimiteMensajeReceptor;

    @Column(name = "xml_respuesta_path", length = 500)
    private String xmlRespuestaPath;

    @Column(name = "respuesta_hacienda_estado", length = 20)
    private String respuestaHaciendaEstado;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public LocalDate getPeriodoDesde() { return periodoDesde; }
    public void setPeriodoDesde(LocalDate periodoDesde) { this.periodoDesde = periodoDesde; }
    public LocalDate getPeriodoHasta() { return periodoHasta; }
    public void setPeriodoHasta(LocalDate periodoHasta) { this.periodoHasta = periodoHasta; }
    public long getMontoCrc() { return montoCrc; }
    public void setMontoCrc(long montoCrc) { this.montoCrc = montoCrc; }
    public LocalDate getFechaLimite() { return fechaLimite; }
    public void setFechaLimite(LocalDate fechaLimite) { this.fechaLimite = fechaLimite; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getClaveXml() { return claveXml; }
    public void setClaveXml(String claveXml) { this.claveXml = claveXml; }
    public String getCedulaEmisor() { return cedulaEmisor; }
    public void setCedulaEmisor(String cedulaEmisor) { this.cedulaEmisor = cedulaEmisor; }
    public Long getTotalFacturaCrc() { return totalFacturaCrc; }
    public void setTotalFacturaCrc(Long totalFacturaCrc) { this.totalFacturaCrc = totalFacturaCrc; }
    public Long getTotalIvaCrc() { return totalIvaCrc; }
    public void setTotalIvaCrc(Long totalIvaCrc) { this.totalIvaCrc = totalIvaCrc; }
    public String getXmlPath() { return xmlPath; }
    public void setXmlPath(String xmlPath) { this.xmlPath = xmlPath; }
    public String getMensajeValidacion() { return mensajeValidacion; }
    public void setMensajeValidacion(String mensajeValidacion) { this.mensajeValidacion = mensajeValidacion; }
    public boolean isRevisada() { return revisada; }
    public void setRevisada(boolean revisada) { this.revisada = revisada; }
    public Long getRevisadaPor() { return revisadaPor; }
    public void setRevisadaPor(Long revisadaPor) { this.revisadaPor = revisadaPor; }
    public LocalDateTime getFechaRevision() { return fechaRevision; }
    public void setFechaRevision(LocalDateTime fechaRevision) { this.fechaRevision = fechaRevision; }
    public LocalDateTime getFechaRecibida() { return fechaRecibida; }
    public void setFechaRecibida(LocalDateTime fechaRecibida) { this.fechaRecibida = fechaRecibida; }
    public String getDesgloseJson() { return desgloseJson; }
    public void setDesgloseJson(String desgloseJson) { this.desgloseJson = desgloseJson; }
    public LocalDateTime getUltimoRecordatorio() { return ultimoRecordatorio; }
    public void setUltimoRecordatorio(LocalDateTime ultimoRecordatorio) { this.ultimoRecordatorio = ultimoRecordatorio; }
    public int getRecordatorios() { return recordatorios; }
    public void setRecordatorios(int recordatorios) { this.recordatorios = recordatorios; }
    public String getMensajeReceptorEstado() { return mensajeReceptorEstado; }
    public void setMensajeReceptorEstado(String mensajeReceptorEstado) { this.mensajeReceptorEstado = mensajeReceptorEstado; }
    public String getMensajeReceptorDetalle() { return mensajeReceptorDetalle; }
    public void setMensajeReceptorDetalle(String mensajeReceptorDetalle) { this.mensajeReceptorDetalle = mensajeReceptorDetalle; }
    public LocalDateTime getMensajeReceptorFecha() { return mensajeReceptorFecha; }
    public void setMensajeReceptorFecha(LocalDateTime mensajeReceptorFecha) { this.mensajeReceptorFecha = mensajeReceptorFecha; }
    public LocalDate getFechaLimiteMensajeReceptor() { return fechaLimiteMensajeReceptor; }
    public void setFechaLimiteMensajeReceptor(LocalDate fechaLimiteMensajeReceptor) { this.fechaLimiteMensajeReceptor = fechaLimiteMensajeReceptor; }
    public String getXmlRespuestaPath() { return xmlRespuestaPath; }
    public void setXmlRespuestaPath(String xmlRespuestaPath) { this.xmlRespuestaPath = xmlRespuestaPath; }
    public String getRespuestaHaciendaEstado() { return respuestaHaciendaEstado; }
    public void setRespuestaHaciendaEstado(String respuestaHaciendaEstado) { this.respuestaHaciendaEstado = respuestaHaciendaEstado; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
