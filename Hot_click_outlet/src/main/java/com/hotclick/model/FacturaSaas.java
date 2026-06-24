package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_factura_saas_tb")
public class FacturaSaas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_factura_saas")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_suscripcion")
    private Suscripcion suscripcion;

    @Column(name = "stripe_invoice_id", length = 100, unique = true)
    private String stripeInvoiceId;

    @Column(name = "stripe_payment_intent", length = 100)
    private String stripePaymentIntent;

    /** Monto en centavos USD */
    @Column(name = "monto_centavos", nullable = false)
    private Integer montoCentavos;

    @Column(name = "moneda", length = 3, nullable = false)
    private String moneda = "usd";

    /** PENDIENTE | PAGADO | FALLIDO | VOID */
    @Column(name = "estado", length = 20, nullable = false)
    private String estado = "PENDIENTE";

    @Column(name = "periodo_inicio")
    private LocalDate periodoInicio;

    @Column(name = "periodo_fin")
    private LocalDate periodoFin;

    @Column(name = "url_pdf", length = 500)
    private String urlPdf;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    public Long getId() { return id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Suscripcion getSuscripcion() { return suscripcion; }
    public void setSuscripcion(Suscripcion s) { this.suscripcion = s; }
    public String getStripeInvoiceId() { return stripeInvoiceId; }
    public void setStripeInvoiceId(String v) { this.stripeInvoiceId = v; }
    public String getStripePaymentIntent() { return stripePaymentIntent; }
    public void setStripePaymentIntent(String v) { this.stripePaymentIntent = v; }
    public Integer getMontoCentavos() { return montoCentavos; }
    public void setMontoCentavos(Integer v) { this.montoCentavos = v; }
    public String getMoneda() { return moneda; }
    public void setMoneda(String v) { this.moneda = v; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDate getPeriodoInicio() { return periodoInicio; }
    public void setPeriodoInicio(LocalDate v) { this.periodoInicio = v; }
    public LocalDate getPeriodoFin() { return periodoFin; }
    public void setPeriodoFin(LocalDate v) { this.periodoFin = v; }
    public String getUrlPdf() { return urlPdf; }
    public void setUrlPdf(String v) { this.urlPdf = v; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
