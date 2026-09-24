package com.hotclick.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_ads_insight_diario_tb",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_ads_insight_dia",
           columnNames = {"fk_id_empresa", "fecha", "canal", "campana", "anuncio_id"}))
public class AdsInsightDiario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_insight")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "canal", nullable = false, length = 40)
    private String canal = "meta";

    @Column(name = "campana", nullable = false, length = 255)
    private String campana;

    @Column(name = "anuncio_id", length = 80)
    private String anuncioId;

    @Column(name = "anuncio_nombre", length = 255)
    private String anuncioNombre;

    @Column(name = "gasto_crc", nullable = false)
    private Integer gastoCrc = 0;

    @Column(name = "impresiones", nullable = false)
    private Long impresiones = 0L;

    @Column(name = "clics", nullable = false)
    private Long clics = 0L;

    @Column(name = "frecuencia", precision = 8, scale = 4)
    private BigDecimal frecuencia;

    @Column(name = "ctr", precision = 8, scale = 6)
    private BigDecimal ctr;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }

    public String getCampana() { return campana; }
    public void setCampana(String campana) { this.campana = campana; }

    public String getAnuncioId() { return anuncioId; }
    public void setAnuncioId(String anuncioId) { this.anuncioId = anuncioId; }

    public String getAnuncioNombre() { return anuncioNombre; }
    public void setAnuncioNombre(String anuncioNombre) { this.anuncioNombre = anuncioNombre; }

    public Integer getGastoCrc() { return gastoCrc; }
    public void setGastoCrc(Integer gastoCrc) { this.gastoCrc = gastoCrc; }

    public Long getImpresiones() { return impresiones; }
    public void setImpresiones(Long impresiones) { this.impresiones = impresiones; }

    public Long getClics() { return clics; }
    public void setClics(Long clics) { this.clics = clics; }

    public BigDecimal getFrecuencia() { return frecuencia; }
    public void setFrecuencia(BigDecimal frecuencia) { this.frecuencia = frecuencia; }

    public BigDecimal getCtr() { return ctr; }
    public void setCtr(BigDecimal ctr) { this.ctr = ctr; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
