package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Evento de billing de plataforma por tenant (cobros, fallos, cambios de plan).
 * Distinto del ledger de wallet (comisiones por venta).
 */
@Entity
@Table(name = "hot_click_billing_ledger_tb")
public class BillingLedger {

    public static final String TIPO_COBRO_OK = "COBRO_OK";
    public static final String TIPO_COBRO_FALLIDO = "COBRO_FALLIDO";
    public static final String TIPO_PLAN_ACTIVADO = "PLAN_ACTIVADO";
    public static final String TIPO_CANCELACION = "CANCELACION";

    public static final String PROVEEDOR_STRIPE = "STRIPE";
    public static final String PROVEEDOR_ONVO = "ONVO";
    public static final String PROVEEDOR_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_billing_ledger")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_suscripcion")
    private Suscripcion suscripcion;

    @Column(name = "tipo", nullable = false, length = 40)
    private String tipo;

    @Column(name = "proveedor", length = 20)
    private String proveedor;

    @Column(name = "referencia_externa", length = 120)
    private String referenciaExterna;

    @Column(name = "monto_centavos")
    private Integer montoCentavos;

    @Column(name = "moneda", nullable = false, length = 3)
    private String moneda = "crc";

    @Column(name = "detalle", length = 500)
    private String detalle;

    @Column(name = "fecha_evento", nullable = false)
    private LocalDateTime fechaEvento = LocalDateTime.now(Constants.ZONA_CR);

    public Long getId() { return id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Suscripcion getSuscripcion() { return suscripcion; }
    public void setSuscripcion(Suscripcion suscripcion) { this.suscripcion = suscripcion; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getProveedor() { return proveedor; }
    public void setProveedor(String proveedor) { this.proveedor = proveedor; }
    public String getReferenciaExterna() { return referenciaExterna; }
    public void setReferenciaExterna(String referenciaExterna) { this.referenciaExterna = referenciaExterna; }
    public Integer getMontoCentavos() { return montoCentavos; }
    public void setMontoCentavos(Integer montoCentavos) { this.montoCentavos = montoCentavos; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
    public LocalDateTime getFechaEvento() { return fechaEvento; }
    public void setFechaEvento(LocalDateTime fechaEvento) { this.fechaEvento = fechaEvento; }
}
