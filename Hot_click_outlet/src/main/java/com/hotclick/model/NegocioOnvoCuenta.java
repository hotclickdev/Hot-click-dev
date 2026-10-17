package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * S3-06: cuenta conectada de pasarela de un negocio (V183). No guarda onboardingUrl, IBAN ni KYC.
 * pctComision y tarifaSemanalCrc quedan NULL hasta que el admin los fija: no hay montos por defecto.
 */
@Entity
@Table(name = "hot_click_negocio_onvo_cuenta_tb",
       uniqueConstraints = @UniqueConstraint(name = "ux_onvo_cuenta_empresa_proveedor_modo",
                                             columnNames = {"fk_id_empresa", "proveedor", "modo"}))
public class NegocioOnvoCuenta {

    public static final String ESTADO_SIN_CUENTA = "SIN_CUENTA";
    public static final String FRECUENCIA_QUINCENAL = "QUINCENAL";
    public static final String FRECUENCIA_MENSUAL = "MENSUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cuenta")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "proveedor", nullable = false, length = 20)
    private String proveedor = "ONVO";

    @Column(name = "modo", nullable = false, length = 10)
    private String modo;

    @Column(name = "onvo_account_id", length = 80)
    private String onvoAccountId;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado = ESTADO_SIN_CUENTA;

    @Column(name = "pct_comision", precision = 5, scale = 2)
    private BigDecimal pctComision;

    @Column(name = "tarifa_semanal_crc")
    private Integer tarifaSemanalCrc;

    @Column(name = "frecuencia_liquidacion", length = 12)
    private String frecuenciaLiquidacion;

    @Column(name = "frecuencia_pendiente", length = 12)
    private String frecuenciaPendiente;

    @Column(name = "cobros_onvo_activos", nullable = false)
    private Boolean cobrosOnvoActivos = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "actualizado_por")
    private Long actualizadoPor;

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { this.empresaId = v; }
    public String getProveedor() { return proveedor; }
    public String getModo() { return modo; }
    public void setModo(String v) { this.modo = v; }
    public String getOnvoAccountId() { return onvoAccountId; }
    public void setOnvoAccountId(String v) { this.onvoAccountId = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public BigDecimal getPctComision() { return pctComision; }
    public void setPctComision(BigDecimal v) { this.pctComision = v; }
    public Integer getTarifaSemanalCrc() { return tarifaSemanalCrc; }
    public void setTarifaSemanalCrc(Integer v) { this.tarifaSemanalCrc = v; }
    public String getFrecuenciaLiquidacion() { return frecuenciaLiquidacion; }
    public void setFrecuenciaLiquidacion(String v) { this.frecuenciaLiquidacion = v; }
    public String getFrecuenciaPendiente() { return frecuenciaPendiente; }
    public void setFrecuenciaPendiente(String v) { this.frecuenciaPendiente = v; }
    public boolean isCobrosOnvoActivos() { return Boolean.TRUE.equals(cobrosOnvoActivos); }
    public void setCobrosOnvoActivos(boolean v) { this.cobrosOnvoActivos = v; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public Long getActualizadoPor() { return actualizadoPor; }

    public void tocar(Long actor) {
        this.fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);
        this.actualizadoPor = actor;
    }
}
