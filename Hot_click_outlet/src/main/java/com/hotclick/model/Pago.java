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
    // columnDefinition solo describe el tipo real que dejan las migraciones (DDL/validate); no cambia binding ni runtime.
    @JoinColumn(name = "fk_id_usuario", nullable = false, columnDefinition = "int4")
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

    /** V226: id del refund de ONVO pedido por el ADMIN (NULL = sin reembolso por ONVO). */
    @Column(name = "onvo_reembolso_id", length = 64)
    private String onvoReembolsoId;

    public String getOnvoReembolsoId() { return onvoReembolsoId; }
    public void setOnvoReembolsoId(String v) { this.onvoReembolsoId = v; }

    /** V227: estado del pedido antes del reembolso ONVO, para restaurarlo si ONVO lo rechaza. */
    @Column(name = "reembolso_estado_pedido_previo", length = 30)
    private String reembolsoEstadoPedidoPrevio;

    /** V227: estado del pago antes del reembolso ONVO. */
    @Column(name = "reembolso_estado_pago_previo", length = 30)
    private String reembolsoEstadoPagoPrevio;

    /** V228: Idempotency-Key del POST /v1/refunds; enviada solo en el primer POST (registro). */
    @Column(name = "reembolso_idempotency_key", length = 80)
    private String reembolsoIdempotencyKey;

    /** V228: resolución manual de un reembolso ONVO pendiente (quién, cuándo y qué). */
    @Column(name = "reembolso_resuelto_por", length = 120)
    private String reembolsoResueltoPor;
    @Column(name = "reembolso_resuelto_en")
    private LocalDateTime reembolsoResueltoEn;
    @Column(name = "reembolso_resolucion", length = 20)
    private String reembolsoResolucion;

    public String getReembolsoResueltoPor() { return reembolsoResueltoPor; }
    public void setReembolsoResueltoPor(String v) { this.reembolsoResueltoPor = v; }
    public LocalDateTime getReembolsoResueltoEn() { return reembolsoResueltoEn; }
    public void setReembolsoResueltoEn(LocalDateTime v) { this.reembolsoResueltoEn = v; }
    public String getReembolsoResolucion() { return reembolsoResolucion; }
    public void setReembolsoResolucion(String v) { this.reembolsoResolucion = v; }

    public String getReembolsoIdempotencyKey() { return reembolsoIdempotencyKey; }
    public void setReembolsoIdempotencyKey(String v) { this.reembolsoIdempotencyKey = v; }

    public String getReembolsoEstadoPedidoPrevio() { return reembolsoEstadoPedidoPrevio; }
    public void setReembolsoEstadoPedidoPrevio(String v) { this.reembolsoEstadoPedidoPrevio = v; }
    public String getReembolsoEstadoPagoPrevio() { return reembolsoEstadoPagoPrevio; }
    public void setReembolsoEstadoPagoPrevio(String v) { this.reembolsoEstadoPagoPrevio = v; }

    /** V223 (BAJO QA7-B1 b): última vez que el respaldo reconsultó este pago cerrado en ONVO (NULL = nunca). */
    @Column(name = "reconsulta_cerrado_en")
    private LocalDateTime reconsultaCerradoEn;

    public LocalDateTime getReconsultaCerradoEn() { return reconsultaCerradoEn; }
    public void setReconsultaCerradoEn(LocalDateTime v) { this.reconsultaCerradoEn = v; }

    /** V217: cuándo se confirmó el envío del aviso (NULL = no confirmado; el barrido reintenta). */
    @Column(name = "aviso_reembolso_admin_enviado_en")
    private LocalDateTime avisoReembolsoAdminEnviadoEn;

    /** V217: intentos de envío del aviso (tope del barrido). */
    @Column(name = "aviso_reembolso_admin_intentos", nullable = false)
    private int avisoReembolsoAdminIntentos = 0;

    /** V217: REEMBOLSO_PENDIENTE previo a V217 sin avisar; va en el correo resumen del primer barrido. */
    @Column(name = "aviso_reembolso_resumen_pendiente", nullable = false)
    private boolean avisoReembolsoResumenPendiente = false;

    public boolean isAvisoReembolsoResumenPendiente() { return avisoReembolsoResumenPendiente; }
    public void setAvisoReembolsoResumenPendiente(boolean v) { this.avisoReembolsoResumenPendiente = v; }
    public LocalDateTime getAvisoReembolsoAdminEnviadoEn() { return avisoReembolsoAdminEnviadoEn; }
    public void setAvisoReembolsoAdminEnviadoEn(LocalDateTime v) { this.avisoReembolsoAdminEnviadoEn = v; }
    public int getAvisoReembolsoAdminIntentos() { return avisoReembolsoAdminIntentos; }
    public void setAvisoReembolsoAdminIntentos(int v) { this.avisoReembolsoAdminIntentos = v; }

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
