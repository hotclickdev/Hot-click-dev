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
    @Column(name = "fec_habilitada", nullable = false)
    private boolean fecHabilitada;
    @Column(name = "fec_permitir_no_inscrito", nullable = false)
    private boolean fecPermitirNoInscrito;

    public Long getId() { return id; }
    public String getRegimenHotclick() { return regimenHotclick; }
    public BigDecimal getExtraNoInscritoPct() { return extraNoInscritoPct; }
    public Integer getDiasEnviarFactura() { return diasEnviarFactura; }
    public Integer getOnvoPagoMinimoCrc() { return onvoPagoMinimoCrc; }
    public Integer getOnvoCostoPagoCrc() { return onvoCostoPagoCrc; }
    public boolean isFecHabilitada() { return fecHabilitada; }
    public boolean isFecPermitirNoInscrito() { return fecPermitirNoInscrito; }
}
