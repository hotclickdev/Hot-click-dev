package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Comprobante electrónico emitido a Hacienda CR (XML 4.3).
 * Los XML se almacenan en Supabase Storage (path), no como TEXT en BD.
 *
 * Tipos: '01'=Factura, '04'=Tiquete, '02'=NDebito, '03'=NCredito
 * Estados: PENDIENTE → ENVIADO → ACEPTADO | RECHAZADO | ERROR
 * Ambientes: STAG (sandbox Hacienda) | PROD (producción real)
 */
@Entity
@Table(name = "hot_click_comprobante_fiscal_tb")
public class ComprobanteFiscal {

    public static final String TIPO_FACTURA  = "01";
    public static final String TIPO_TIQUETE  = "04";
    public static final String TIPO_N_DEBITO = "02";
    public static final String TIPO_N_CREDITO= "03";

    public static final String ESTADO_PENDIENTE  = "PENDIENTE";
    public static final String ESTADO_ENVIADO    = "ENVIADO";
    public static final String ESTADO_ACEPTADO   = "ACEPTADO";
    public static final String ESTADO_RECHAZADO  = "RECHAZADO";
    public static final String ESTADO_ERROR      = "ERROR";

    public static final String AMBIENTE_STAG = "STAG";
    public static final String AMBIENTE_PROD = "PROD";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comprobante")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pedido")
    private Pedido pedido;

    @Column(name = "tipo", nullable = false, length = 2)
    private String tipo = TIPO_TIQUETE;

    @Column(name = "clave_numerica", unique = true, nullable = false, length = 50)
    private String claveNumerica;

    @Column(name = "numero_consecutivo", length = 20)
    private String numeroConsecutivo;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = ESTADO_PENDIENTE;

    @Column(name = "ambiente", nullable = false, length = 4)
    private String ambiente = AMBIENTE_STAG;

    /** Path en Supabase Storage: /{empresaId}/facturas/{clave}.xml */
    @Column(name = "xml_path", length = 500)
    private String xmlPath;

    @Column(name = "xml_respuesta_path", length = 500)
    private String xmlRespuestaPath;

    @Column(name = "mensaje_hacienda", columnDefinition = "TEXT")
    private String mensajeHacienda;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDateTime fechaEmision = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_respuesta")
    private LocalDateTime fechaRespuesta;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(name = "total_neto")
    private Integer totalNeto;

    @Column(name = "total_impuesto")
    private Integer totalImpuesto;

    @Column(name = "total_factura")
    private Integer totalFactura;

    @Column(name = "moneda", length = 3)
    private String moneda = "CRC";

    @Column(name = "receptor_cedula", length = 20)
    private String receptorCedula;

    @Column(name = "receptor_tipo", length = 2)
    private String receptorTipo;

    @Column(name = "receptor_nombre", length = 200)
    private String receptorNombre;

    @Column(name = "receptor_correo", length = 200)
    private String receptorCorreo;

    @Column(name = "intentos_envio")
    private Integer intentosEnvio = 0;

    // ── getters/setters ──────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getClaveNumerica() { return claveNumerica; }
    public void setClaveNumerica(String claveNumerica) { this.claveNumerica = claveNumerica; }

    public String getNumeroConsecutivo() { return numeroConsecutivo; }
    public void setNumeroConsecutivo(String numeroConsecutivo) { this.numeroConsecutivo = numeroConsecutivo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getAmbiente() { return ambiente; }
    public void setAmbiente(String ambiente) { this.ambiente = ambiente; }

    public String getXmlPath() { return xmlPath; }
    public void setXmlPath(String xmlPath) { this.xmlPath = xmlPath; }

    public String getXmlRespuestaPath() { return xmlRespuestaPath; }
    public void setXmlRespuestaPath(String xmlRespuestaPath) { this.xmlRespuestaPath = xmlRespuestaPath; }

    public String getMensajeHacienda() { return mensajeHacienda; }
    public void setMensajeHacienda(String mensajeHacienda) { this.mensajeHacienda = mensajeHacienda; }

    public LocalDateTime getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDateTime fechaEmision) { this.fechaEmision = fechaEmision; }

    public LocalDateTime getFechaRespuesta() { return fechaRespuesta; }
    public void setFechaRespuesta(LocalDateTime fechaRespuesta) { this.fechaRespuesta = fechaRespuesta; }

    public Long getReferenciaId() { return referenciaId; }
    public void setReferenciaId(Long referenciaId) { this.referenciaId = referenciaId; }

    public Integer getTotalNeto() { return totalNeto; }
    public void setTotalNeto(Integer totalNeto) { this.totalNeto = totalNeto; }

    public Integer getTotalImpuesto() { return totalImpuesto; }
    public void setTotalImpuesto(Integer totalImpuesto) { this.totalImpuesto = totalImpuesto; }

    public Integer getTotalFactura() { return totalFactura; }
    public void setTotalFactura(Integer totalFactura) { this.totalFactura = totalFactura; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public String getReceptorCedula() { return receptorCedula; }
    public void setReceptorCedula(String receptorCedula) { this.receptorCedula = receptorCedula; }

    public String getReceptorTipo() { return receptorTipo; }
    public void setReceptorTipo(String receptorTipo) { this.receptorTipo = receptorTipo; }

    public String getReceptorNombre() { return receptorNombre; }
    public void setReceptorNombre(String receptorNombre) { this.receptorNombre = receptorNombre; }

    public String getReceptorCorreo() { return receptorCorreo; }
    public void setReceptorCorreo(String receptorCorreo) { this.receptorCorreo = receptorCorreo; }

    public Integer getIntentosEnvio() { return intentosEnvio != null ? intentosEnvio : 0; }
    public void setIntentosEnvio(Integer intentosEnvio) { this.intentosEnvio = intentosEnvio; }
}
