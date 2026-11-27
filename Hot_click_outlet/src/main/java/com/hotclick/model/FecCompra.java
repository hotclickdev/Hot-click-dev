package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Factura Electrónica de Compra (tipo 08) consolidada por negocio y quincena (V245). */
@Entity
@Table(name = "hot_click_fec_tb")
public class FecCompra {

    public static final String GENERADA = "GENERADA";
    public static final String ENVIADA = "ENVIADA";
    public static final String ACEPTADA = "ACEPTADA";
    public static final String RECHAZADA = "RECHAZADA";
    public static final String TIPO = "08";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_fec")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "periodo_desde", nullable = false)
    private LocalDate periodoDesde;

    @Column(name = "periodo_hasta", nullable = false)
    private LocalDate periodoHasta;

    @Column(name = "monto_compra", nullable = false)
    private long montoCompra;

    @Column(name = "estado", nullable = false, length = 12)
    private String estado = GENERADA;

    @Column(name = "clave_numerica", nullable = false, unique = true, length = 50)
    private String claveNumerica;

    @Column(name = "numero_consecutivo", nullable = false, length = 20)
    private String numeroConsecutivo;

    /** XML sin firmar. El firmado se arma al enviar y no se guarda. */
    @Column(name = "xml", columnDefinition = "TEXT")
    private String xml;

    @Column(name = "mensaje_hacienda", length = 1000)
    private String mensajeHacienda;

    @Column(name = "ambiente", length = 4)
    private String ambiente;

    @Column(name = "intentos_envio", nullable = false)
    private int intentosEnvio;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "fecha_envio")
    private LocalDateTime fechaEnvio;

    @Column(name = "fecha_respuesta")
    private LocalDateTime fechaRespuesta;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public LocalDate getPeriodoDesde() { return periodoDesde; }
    public void setPeriodoDesde(LocalDate v) { this.periodoDesde = v; }
    public LocalDate getPeriodoHasta() { return periodoHasta; }
    public void setPeriodoHasta(LocalDate v) { this.periodoHasta = v; }
    public long getMontoCompra() { return montoCompra; }
    public void setMontoCompra(long v) { this.montoCompra = v; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getClaveNumerica() { return claveNumerica; }
    public void setClaveNumerica(String v) { this.claveNumerica = v; }
    public String getNumeroConsecutivo() { return numeroConsecutivo; }
    public void setNumeroConsecutivo(String v) { this.numeroConsecutivo = v; }
    public String getXml() { return xml; }
    public void setXml(String xml) { this.xml = xml; }
    public String getMensajeHacienda() { return mensajeHacienda; }
    public void setMensajeHacienda(String v) { this.mensajeHacienda = v; }
    public String getAmbiente() { return ambiente; }
    public void setAmbiente(String ambiente) { this.ambiente = ambiente; }
    public int getIntentosEnvio() { return intentosEnvio; }
    public void setIntentosEnvio(int v) { this.intentosEnvio = v; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime v) { this.fechaCreacion = v; }
    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
    public void setFechaEnvio(LocalDateTime v) { this.fechaEnvio = v; }
    public LocalDateTime getFechaRespuesta() { return fechaRespuesta; }
    public void setFechaRespuesta(LocalDateTime v) { this.fechaRespuesta = v; }
}
