package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/**
 * Fila única (id=1) con las reglas fiscales de la plataforma (V244). Se lee y escribe con
 * {@code ConfiguracionFiscalService}; el mapeo existe para que el esquema de pruebas (ddl-auto) la cree.
 */
@Entity
@Table(name = "hot_click_config_fiscal_tb")
public class ConfigFiscal {
    @Id
    private Long id;
    @Column(name = "regimen_hotclick", nullable = false, length = 20)
    private String regimenHotclick;
    @Column(name = "extra_no_inscrito_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal extraNoInscritoPct;
    @Column(name = "dias_enviar_factura", nullable = false)
    private Integer diasEnviarFactura;
    @Column(name = "onvo_pago_minimo_crc", nullable = false)
    private Integer onvoPagoMinimoCrc;
    @Column(name = "onvo_costo_pago_crc", nullable = false)
    private Integer onvoCostoPagoCrc;
    // V263: con DEFAULT para que el INSERT de la fila única sin estas columnas (V244) siga funcionando en el esquema de pruebas.
    /** V263: salario base (₡) para el tope anual de compras del RTS. */
    @Column(name = "salario_base_crc", columnDefinition = "INTEGER NOT NULL DEFAULT 462200")
    private Integer salarioBaseCrc;
    /** V263: tope mensual de gasto en IA del Contador (USD). */
    @Column(name = "tope_ia_mes_usd", columnDefinition = "NUMERIC(8,2) NOT NULL DEFAULT 20.00")
    private BigDecimal topeIaMesUsd;
    /** V263: preguntas por día y ADMIN al Contador IA. */
    @Column(name = "limite_preguntas_dia", columnDefinition = "INTEGER NOT NULL DEFAULT 30")
    private Integer limitePreguntasDia;

    @Column(name = "onvo_cobro_a_nombre_negocio", nullable = false, columnDefinition = "boolean default false")
    private Boolean onvoCobroANombreNegocio = false;
    @Column(name = "onvo_enlaces_pago", nullable = false, columnDefinition = "boolean default false")
    private Boolean onvoEnlacesPago = false;

    public Boolean getOnvoCobroANombreNegocio() { return onvoCobroANombreNegocio; }
    public Boolean getOnvoEnlacesPago() { return onvoEnlacesPago; }
    public Long getId() { return id; }
    public String getRegimenHotclick() { return regimenHotclick; }
    public BigDecimal getExtraNoInscritoPct() { return extraNoInscritoPct; }
    public Integer getDiasEnviarFactura() { return diasEnviarFactura; }
    public Integer getOnvoPagoMinimoCrc() { return onvoPagoMinimoCrc; }
    public Integer getOnvoCostoPagoCrc() { return onvoCostoPagoCrc; }
    public Integer getSalarioBaseCrc() { return salarioBaseCrc; }
    public BigDecimal getTopeIaMesUsd() { return topeIaMesUsd; }
    public Integer getLimitePreguntasDia() { return limitePreguntasDia; }
}
