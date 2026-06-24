package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "hot_click_cotizacion_tb")
public class Cotizacion extends BaseEntity {

    public static final String ESTADO_BORRADOR  = "BORRADOR";
    public static final String ESTADO_ENVIADA   = "ENVIADA";
    public static final String ESTADO_APROBADA  = "APROBADA";
    public static final String ESTADO_RECHAZADA = "RECHAZADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cotizacion")
    private Long id;

    // ── Campos legacy (compatibilidad hacia atrás) ───────────────────────────────
    @Column(name = "nombre_cliente", length = 200)
    private String nombreCliente;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "productos", columnDefinition = "text")
    private String productosJson;

    @Column(name = "total")
    private Integer total = 0;

    @Column(name = "mensaje_enviado", columnDefinition = "text")
    private String mensajeEnviado;

    @Column(name = "fecha_cotizacion")
    private LocalDateTime fechaCotizacion;

    // ── Campos B2B ───────────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id")
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private CotizacionCliente cliente;

    @Column(name = "numero_cotizacion", length = 30)
    private String numeroCotizacion;

    @Column(name = "fecha_emision")
    private LocalDate fechaEmision;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "estado_cotizacion", length = 30)
    private String estadoCotizacion = ESTADO_BORRADOR;

    @Column(name = "aplica_iva", nullable = false)
    private Boolean aplicaIva = false;

    @Column(name = "porcentaje_iva")
    private Integer porcentajeIva = 13;

    @Column(name = "subtotal")
    private Integer subtotal = 0;

    @Column(name = "monto_iva")
    private Integer montoIva = 0;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;

    @Column(name = "terminos", columnDefinition = "text")
    private String terminos;

    @Column(name = "token_publico")
    private UUID tokenPublico;

    @Column(name = "moneda", length = 10)
    private String moneda = "CRC";

    @OneToMany(mappedBy = "cotizacion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<CotizacionItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (fechaCotizacion == null) fechaCotizacion = LocalDateTime.now(Constants.ZONA_CR);
        if (tokenPublico == null)    tokenPublico    = UUID.randomUUID();
    }

    // ── Getters / Setters ────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String v) { this.nombreCliente = v; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String v) { this.telefono = v; }

    public String getProductosJson() { return productosJson; }
    public void setProductosJson(String v) { this.productosJson = v; }

    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }

    public String getMensajeEnviado() { return mensajeEnviado; }
    public void setMensajeEnviado(String v) { this.mensajeEnviado = v; }

    public LocalDateTime getFechaCotizacion() { return fechaCotizacion; }
    public void setFechaCotizacion(LocalDateTime v) { this.fechaCotizacion = v; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public CotizacionCliente getCliente() { return cliente; }
    public void setCliente(CotizacionCliente cliente) { this.cliente = cliente; }

    public String getNumeroCotizacion() { return numeroCotizacion; }
    public void setNumeroCotizacion(String v) { this.numeroCotizacion = v; }

    public LocalDate getFechaEmision() { return fechaEmision; }
    public void setFechaEmision(LocalDate v) { this.fechaEmision = v; }

    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate v) { this.fechaVencimiento = v; }

    public String getEstadoCotizacion() { return estadoCotizacion; }
    public void setEstadoCotizacion(String v) { this.estadoCotizacion = v; }

    public Boolean getAplicaIva() { return aplicaIva; }
    public void setAplicaIva(Boolean aplicaIva) { this.aplicaIva = aplicaIva; }

    public Integer getPorcentajeIva() { return porcentajeIva; }
    public void setPorcentajeIva(Integer porcentajeIva) { this.porcentajeIva = porcentajeIva; }

    public Integer getSubtotal() { return subtotal; }
    public void setSubtotal(Integer subtotal) { this.subtotal = subtotal; }

    public Integer getMontoIva() { return montoIva; }
    public void setMontoIva(Integer montoIva) { this.montoIva = montoIva; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String v) { this.observaciones = v; }

    public String getTerminos() { return terminos; }
    public void setTerminos(String v) { this.terminos = v; }

    public UUID getTokenPublico() { return tokenPublico; }
    public void setTokenPublico(UUID tokenPublico) { this.tokenPublico = tokenPublico; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public List<CotizacionItem> getItems() { return items; }
    public void setItems(List<CotizacionItem> items) { this.items = items; }
}
