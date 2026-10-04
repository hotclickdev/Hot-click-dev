package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Factura de compra o nota de crédito de un proveedor, ya resumida para el D-105.
 * La nota de crédito queda con montos negativos para que la suma del trimestre sea neta.
 */
@Entity
@Table(name = "hot_click_compra_d105_tb")
public class CompraD105 {

    public static final String FACTURA = "01";
    public static final String NOTA_CREDITO = "03";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra_d105")
    private Long id;

    @Column(name = "clave_numerica", nullable = false, unique = true, length = 50)
    private String claveNumerica;

    @Column(name = "tipo_documento", nullable = false, length = 2)
    private String tipoDocumento;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDate fechaEmision;

    @Column(name = "anio", nullable = false)
    private Integer anio;

    @Column(name = "trimestre", nullable = false, length = 2)
    private String trimestre;

    @Column(name = "emisor_cedula", nullable = false, length = 20)
    private String emisorCedula;

    @Column(name = "emisor_nombre", nullable = false, length = 200)
    private String emisorNombre;

    @Column(name = "subtotal_neto", nullable = false)
    private Integer subtotalNeto;

    @Column(name = "total_impuesto", nullable = false)
    private Integer totalImpuesto;

    @Column(name = "total_comprobante", nullable = false)
    private Integer totalComprobante;

    @JsonIgnore
    @Column(name = "xml_path", length = 500)
    private String xmlPath;

    @JsonIgnore
    @Column(name = "foto_path", length = 500)
    private String fotoPath;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario_carga")
    private Usuario usuarioCarga;

    @Column(name = "fecha_carga", nullable = false)
    private LocalDateTime fechaCarga;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getClaveNumerica() { return claveNumerica; }
    public void setClaveNumerica(String claveNumerica) { this.claveNumerica = claveNumerica; }

    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String tipoDocumento) { this.tipoDocumento = tipoDocumento; }

    public LocalDate getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDate fechaEmision) { this.fechaEmision = fechaEmision; }

    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }

    public String getTrimestre() { return trimestre; }
    public void setTrimestre(String trimestre) { this.trimestre = trimestre; }

    public String getEmisorCedula() { return emisorCedula; }
    public void setEmisorCedula(String emisorCedula) { this.emisorCedula = emisorCedula; }

    public String getEmisorNombre() { return emisorNombre; }
    public void setEmisorNombre(String emisorNombre) { this.emisorNombre = emisorNombre; }

    public Integer getSubtotalNeto() { return subtotalNeto; }
    public void setSubtotalNeto(Integer subtotalNeto) { this.subtotalNeto = subtotalNeto; }

    public Integer getTotalImpuesto() { return totalImpuesto; }
    public void setTotalImpuesto(Integer totalImpuesto) { this.totalImpuesto = totalImpuesto; }

    public Integer getTotalComprobante() { return totalComprobante; }
    public void setTotalComprobante(Integer totalComprobante) { this.totalComprobante = totalComprobante; }

    public String getXmlPath() { return xmlPath; }
    public void setXmlPath(String xmlPath) { this.xmlPath = xmlPath; }

    public String getFotoPath() { return fotoPath; }
    public void setFotoPath(String fotoPath) { this.fotoPath = fotoPath; }

    public Usuario getUsuarioCarga() { return usuarioCarga; }
    public void setUsuarioCarga(Usuario usuarioCarga) { this.usuarioCarga = usuarioCarga; }

    public LocalDateTime getFechaCarga() { return fechaCarga; }
    public void setFechaCarga(LocalDateTime fechaCarga) { this.fechaCarga = fechaCarga; }
}
