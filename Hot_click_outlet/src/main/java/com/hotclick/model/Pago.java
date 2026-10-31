package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_pago_tb")
public class Pago extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pago")
    private Long id;

    @Column(name = "merchant_token", unique = true, nullable = false, length = 500)
    private String merchantToken;

    @Column(name = "redirect_url", length = 1000)
    private String redirectUrl;

    @Column(name = "monto", nullable = false)
    private Integer monto;

    @Column(name = "moneda", length = 3)
    private String moneda = "CRC";

    @Column(name = "estado_pago", length = 30)
    private String estadoPago = "PENDIENTE";

    @Column(name = "metodo_pago_tipo", length = 30)
    private String metodoPagoTipo;

    @Column(name = "proveedor", length = 20, nullable = false)
    private String proveedor = "STRIPE";

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @Column(name = "fecha_expiracion")
    private LocalDateTime fechaExpiracion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pedido", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    /** Compra cobrada por este pago; {@link #pedido} es el paquete 1 de esa compra. */
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_compra")
    private Compra compra;

    /** SINPERefNumber de ONVO (25 caracteres), solo después del pago. V189. */
    @Column(name = "sinpe_ref_number", length = 25)
    private String sinpeRefNumber;

    /** P-01 (V195): plazo interno de HotClick para el intent SINPE de ONVO (ONVO no define vencimiento). */
    @Column(name = "plazo_interno_sinpe")
    private LocalDateTime plazoInternoSinpe;

    /** V215 (PR #460): parte del cobro que se debe devolver (paquetes cancelados en un cobro parcial). */
    @Column(name = "monto_reembolso_pendiente")
    private Integer montoReembolsoPendiente;

    /** V215 (PR #460): parte del cobro ya devuelta fuera de la plataforma (resolución del ADMIN). */
    @Column(name = "monto_reembolsado")
    private Integer montoReembolsado;

    public Integer getMontoReembolsoPendiente() { return montoReembolsoPendiente; }
    public void setMontoReembolsoPendiente(Integer v) { this.montoReembolsoPendiente = v; }
    public Integer getMontoReembolsado() { return montoReembolsado; }
    public void setMontoReembolsado(Integer v) { this.montoReembolsado = v; }

    /** V216: cuándo se avisó al admin de un REEMBOLSO_PENDIENTE (dedupe del aviso; NULL = sin avisar). */
    @Column(name = "aviso_reembolso_admin_en")
    private LocalDateTime avisoReembolsoAdminEn;

    public LocalDateTime getAvisoReembolsoAdminEn() { return avisoReembolsoAdminEn; }
    public void setAvisoReembolsoAdminEn(LocalDateTime v) { this.avisoReembolsoAdminEn = v; }

    public String getSinpeRefNumber() { return sinpeRefNumber; }
    public LocalDateTime getPlazoInternoSinpe() { return plazoInternoSinpe; }
    public void setPlazoInternoSinpe(LocalDateTime plazoInternoSinpe) { this.plazoInternoSinpe = plazoInternoSinpe; }
    public void setSinpeRefNumber(String sinpeRefNumber) { this.sinpeRefNumber = sinpeRefNumber; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMerchantToken() { return merchantToken; }
    public void setMerchantToken(String merchantToken) { this.merchantToken = merchantToken; }

    public String getRedirectUrl() { return redirectUrl; }
    public void setRedirectUrl(String redirectUrl) { this.redirectUrl = redirectUrl; }

    public Integer getMonto() { return monto; }
    public void setMonto(Integer monto) { this.monto = monto; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public String getEstadoPago() { return estadoPago; }
    public void setEstadoPago(String estadoPago) { this.estadoPago = estadoPago; }

    public String getMetodoPagoTipo() { return metodoPagoTipo; }
    public void setMetodoPagoTipo(String metodoPagoTipo) { this.metodoPagoTipo = metodoPagoTipo; }

    public String getProveedor() { return proveedor; }
    public void setProveedor(String proveedor) { this.proveedor = proveedor; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }

    public LocalDateTime getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDateTime fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Compra getCompra() { return compra; }
    public void setCompra(Compra compra) { this.compra = compra; }
}
