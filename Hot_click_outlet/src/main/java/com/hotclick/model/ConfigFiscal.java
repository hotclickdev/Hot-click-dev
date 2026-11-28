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

    @Column(name = "hacienda_mensaje_receptor_habilitado", nullable = false, columnDefinition = "boolean default false")
    private boolean haciendaMensajeReceptorHabilitado;
    @Column(name = "tolerancia_factura_negocio_crc", nullable = false, columnDefinition = "integer default 1")
    private Integer toleranciaFacturaNegocioCrc = 1;
    @Column(name = "base_factura_negocio", nullable = false, length = 10, columnDefinition = "varchar(10) default 'NETO'")
    private String baseFacturaNegocio = "NETO";

    @Column(name = "onvo_cobro_a_nombre_negocio", nullable = false, columnDefinition = "boolean default false")
    private Boolean onvoCobroANombreNegocio = false;
    @Column(name = "onvo_enlaces_pago", nullable = false, columnDefinition = "boolean default false")
    private Boolean onvoEnlacesPago = false;

    public Boolean getOnvoCobroANombreNegocio() { return onvoCobroANombreNegocio; }
    public Boolean getOnvoEnlacesPago() { return onvoEnlacesPago; }
    public Long getId() { return id; }
    public boolean isHaciendaMensajeReceptorHabilitado() { return haciendaMensajeReceptorHabilitado; }
    public Integer getToleranciaFacturaNegocioCrc() { return toleranciaFacturaNegocioCrc; }
    public String getBaseFacturaNegocio() { return baseFacturaNegocio; }
    public String getRegimenHotclick() { return regimenHotclick; }
    public BigDecimal getExtraNoInscritoPct() { return extraNoInscritoPct; }
    public Integer getDiasEnviarFactura() { return diasEnviarFactura; }
    public Integer getOnvoPagoMinimoCrc() { return onvoPagoMinimoCrc; }
    public Integer getOnvoCostoPagoCrc() { return onvoCostoPagoCrc; }
}
