package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_wallet_transaccion_tb")
public class WalletTransaccion {

    public static final String CREDITO_VENTA       = "CREDITO_VENTA";
    public static final String DEBITO_PAYOUT        = "DEBITO_PAYOUT";
    public static final String RETENCION_PAYOUT     = "RETENCION_PAYOUT";
    public static final String LIBERACION_PAYOUT    = "LIBERACION_PAYOUT";
    public static final String DEVOLUCION           = "DEVOLUCION";
    public static final String AJUSTE_MANUAL        = "AJUSTE_MANUAL";

    public static final String REF_PEDIDO  = "PEDIDO";
    public static final String REF_PAYOUT  = "PAYOUT";
    public static final String REF_MANUAL  = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transaccion")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "tipo", nullable = false, length = 25)
    private String tipo;

    /** Positivo = crédito, negativo = débito. En ₡ enteros. */
    @Column(name = "monto", nullable = false)
    private Long monto;

    @Column(name = "saldo_tras_movimiento", nullable = false)
    private Long saldoTrasMovimiento = 0L;

    // Desglose venta
    @Column(name = "total_bruto")
    private Long totalBruto;

    @Column(name = "comision_saas")
    private Long comisionSaas;

    @Column(name = "comision_gw")
    private Long comisionGw;

    // Referencia
    @Column(name = "referencia_tipo", length = 20)
    private String referenciaTipo;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    // Getters/Setters
    public Long getId()                         { return id; }
    public void setId(Long v)                   { this.id = v; }

    public Long getEmpresaId()                  { return empresaId; }
    public void setEmpresaId(Long v)            { this.empresaId = v; }

    public String getTipo()                     { return tipo; }
    public void setTipo(String v)               { this.tipo = v; }

    public Long getMonto()                      { return monto; }
    public void setMonto(Long v)                { this.monto = v; }

    public Long getSaldoTrasMovimiento()        { return saldoTrasMovimiento; }
    public void setSaldoTrasMovimiento(Long v)  { this.saldoTrasMovimiento = v; }

    public Long getTotalBruto()                 { return totalBruto; }
    public void setTotalBruto(Long v)           { this.totalBruto = v; }

    public Long getComisionSaas()               { return comisionSaas; }
    public void setComisionSaas(Long v)         { this.comisionSaas = v; }

    public Long getComisionGw()                 { return comisionGw; }
    public void setComisionGw(Long v)           { this.comisionGw = v; }

    public String getReferenciaTipo()           { return referenciaTipo; }
    public void setReferenciaTipo(String v)     { this.referenciaTipo = v; }

    public Long getReferenciaId()               { return referenciaId; }
    public void setReferenciaId(Long v)         { this.referenciaId = v; }

    public String getDescripcion()              { return descripcion; }
    public void setDescripcion(String v)        { this.descripcion = v; }

    public LocalDateTime getFechaCreacion()     { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime v) { this.fechaCreacion = v; }
}
