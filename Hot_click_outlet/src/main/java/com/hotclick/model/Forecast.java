package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_forecast_tb",
    uniqueConstraints = @UniqueConstraint(columnNames = {"fk_id_empresa", "fk_id_producto", "periodo", "tipo"}))
public class Forecast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_forecast")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "fk_id_producto")
    private Long productoId;

    /** Format: YYYY-WW (week) or YYYY-MM (month) */
    @Column(name = "periodo", nullable = false, length = 10)
    private String periodo;

    /** SEMANAL | MENSUAL */
    @Column(name = "tipo", nullable = false, length = 10)
    private String tipo = "SEMANAL";

    @Column(name = "unidades_forecast", nullable = false)
    private Integer unidadesForecast = 0;

    @Column(name = "ingresos_forecast", nullable = false)
    private Integer ingresosForecast = 0;

    @Column(name = "confianza", precision = 5, scale = 2)
    private BigDecimal confianza = BigDecimal.ZERO;

    @Column(name = "fecha_generacion")
    private LocalDateTime fechaGeneracion;

    @PrePersist
    void onCreate() { fechaGeneracion = LocalDateTime.now(Constants.ZONA_CR); }

    public Long getId() { return id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Integer getUnidadesForecast() { return unidadesForecast; }
    public void setUnidadesForecast(Integer unidadesForecast) { this.unidadesForecast = unidadesForecast; }

    public Integer getIngresosForecast() { return ingresosForecast; }
    public void setIngresosForecast(Integer ingresosForecast) { this.ingresosForecast = ingresosForecast; }

    public BigDecimal getConfianza() { return confianza; }
    public void setConfianza(BigDecimal confianza) { this.confianza = confianza; }

    public LocalDateTime getFechaGeneracion() { return fechaGeneracion; }
}
