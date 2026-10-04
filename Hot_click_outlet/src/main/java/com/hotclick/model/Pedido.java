package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonRawValue;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.hotclick.utils.TokenSeguimientoPedido;
import jakarta.persistence.*;
import org.hibernate.Hibernate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_pedido_tb")
public class Pedido extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido")
    private Long id;

    @Column(name = "numero_pedido", unique = true, nullable = false, length = 20)
    private String numeroPedido;

    /** Subpedidos de un mismo checkout (uno por vendedor) comparten este valor y un único Pago. */
    @Column(name = "grupo_pago", length = 40)
    private String grupoPago;

    /**
     * Token del enlace público de seguimiento (/seguimiento/{token}) que va en los correos al comprador.
     * Nunca se serializa: un vendedor que ve su subpedido no debe poder abrir los paquetes de otros vendedores.
     */
    @JsonIgnore
    @Column(name = "token_seguimiento", length = 64, unique = true)
    private String tokenSeguimiento;

    @Column(name = "fecha_pedido")
    private LocalDateTime fechaPedido;

    @Column(name = "fecha_entrega_estimada")
    private LocalDate fechaEntregaEstimada;

    @Column(name = "fecha_entrega_real")
    private LocalDate fechaEntregaReal;

    @Column(name = "subtotal", nullable = false)
    private Integer subtotal;

    @Column(name = "descuento_total")
    private Integer descuentoTotal = 0;

    @Column(name = "aplica_impuesto")
    private Boolean aplicaImpuesto = false;

    @Column(name = "monto_impuesto")
    private Integer montoImpuesto = 0;

    @Column(name = "total_pedido", nullable = false)
    private Integer totalPedido;

    @Column(name = "costo_envio")
    private Integer costoEnvio = 0;

    @Column(name = "costo_total_productos", nullable = false)
    private Integer costoTotalProductos;

    @Column(name = "utilidad_bruta", nullable = false)
    private Integer utilidadBruta;

    @Column(name = "margen_ganancia_pedido", precision = 8, scale = 2)
    private BigDecimal margenGananciaPedido;

    @Column(name = "origen", length = 20)
    private String origen = "ONLINE";

    // VARCHAR(30) desde V146: PENDIENTE_COMPROBANTE (21) no cabía en 20.
    @Column(name = "estado_pedido", length = 30)
    private String estadoPedido = "PENDIENTE";

    @Column(name = "metodo_pago", nullable = false, length = 30)
    private String metodoPago;

    @Column(name = "metodo_envio", nullable = false, length = 30)
    private String metodoEnvio;

    @Column(name = "notas")
    private String notas;

    @Column(name = "factura_generada")
    private Boolean facturaGenerada = false;

    @Column(name = "factura_enviada_whatsapp")
    private Boolean facturaEnviadaWhatsapp = false;

    @Column(name = "numero_guia", length = 50)
    private String numeroGuia;

    @Column(name = "url_tracking", length = 500)
    private String urlTracking;

    @Column(name = "notificaciones", columnDefinition = "text")
    private String notificaciones = "[]";

    @Column(name = "cupon_codigo", length = 20)
    private String cuponCodigo;

    // ── Gift card (F17) ───────────────────────────────────────────────────────
    @Column(name = "gift_card_codigo", length = 30)
    private String giftCardCodigo;

    @Column(name = "gift_card_monto")
    private Integer giftCardMonto = 0;

    // ── Self-checkout QR (F16) ────────────────────────────────────────────────
    /** Nombre de la mesa que generó el pedido (desnormalizado) */
    @Column(name = "mesa_nombre", length = 100)
    private String mesaNombre;

    /** Nombre ingresado por el cliente en el terminal de autoservicio */
    @Column(name = "cliente_nombre", length = 100)
    private String clienteNombre;

    /** Teléfono opcional del cliente */
    @Column(name = "cliente_tel", length = 30)
    private String clienteTel;

    @Column(name = "fecha_envio")
    private LocalDateTime fechaEnvio;

    /** Dirección de entrega del checkout (señas, cantón, provincia); null en retiro. V148. */
    @Column(name = "direccion_entrega", length = 500)
    private String direccionEntrega;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    // roles ignorado: usuarioFinal se carga via JOIN FETCH (entidad real, no proxy)
    // pero su colección roles sigue lazy y la sesión ya cerró al serializar.
    @JsonIgnoreProperties({"roles"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario_final", nullable = false)
    private Usuario usuarioFinal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_bodega", nullable = false)
    private Bodega bodega;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL)
    private List<PedidoItem> items = new ArrayList<>();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_compra")
    private Compra compra;

    /** Posición del paquete dentro de la compra (1..n). Null en pedidos previos a V142. */
    @Column(name = "numero_paquete")
    private Integer numeroPaquete;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroPedido() { return numeroPedido; }
    public void setNumeroPedido(String numeroPedido) { this.numeroPedido = numeroPedido; }

    public LocalDateTime getFechaPedido() { return fechaPedido; }
    public void setFechaPedido(LocalDateTime fechaPedido) { this.fechaPedido = fechaPedido; }

    public LocalDate getFechaEntregaEstimada() { return fechaEntregaEstimada; }
    public void setFechaEntregaEstimada(LocalDate fechaEntregaEstimada) { this.fechaEntregaEstimada = fechaEntregaEstimada; }

    public LocalDate getFechaEntregaReal() { return fechaEntregaReal; }
    public void setFechaEntregaReal(LocalDate fechaEntregaReal) { this.fechaEntregaReal = fechaEntregaReal; }

    public Integer getSubtotal() { return subtotal; }
    public void setSubtotal(Integer subtotal) { this.subtotal = subtotal; }

    public Integer getDescuentoTotal() { return descuentoTotal; }
    public void setDescuentoTotal(Integer descuentoTotal) { this.descuentoTotal = descuentoTotal; }

    public Boolean getAplicaImpuesto() { return aplicaImpuesto; }
    public void setAplicaImpuesto(Boolean aplicaImpuesto) { this.aplicaImpuesto = aplicaImpuesto; }

    public Integer getMontoImpuesto() { return montoImpuesto; }
    public void setMontoImpuesto(Integer montoImpuesto) { this.montoImpuesto = montoImpuesto; }

    public Integer getTotalPedido() { return totalPedido; }
    public void setTotalPedido(Integer totalPedido) { this.totalPedido = totalPedido; }

    public Integer getCostoEnvio() { return costoEnvio; }
    public void setCostoEnvio(Integer costoEnvio) { this.costoEnvio = costoEnvio; }

    public Integer getCostoTotalProductos() { return costoTotalProductos; }
    public void setCostoTotalProductos(Integer costoTotalProductos) { this.costoTotalProductos = costoTotalProductos; }

    public Integer getUtilidadBruta() { return utilidadBruta; }
    public void setUtilidadBruta(Integer utilidadBruta) { this.utilidadBruta = utilidadBruta; }

    public BigDecimal getMargenGananciaPedido() { return margenGananciaPedido; }
    public void setMargenGananciaPedido(BigDecimal margenGananciaPedido) { this.margenGananciaPedido = margenGananciaPedido; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getEstadoPedido() { return estadoPedido; }
    public void setEstadoPedido(String estadoPedido) { this.estadoPedido = estadoPedido; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getMetodoEnvio() { return metodoEnvio; }
    public void setMetodoEnvio(String metodoEnvio) { this.metodoEnvio = metodoEnvio; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public Boolean getFacturaGenerada() { return facturaGenerada; }
    public void setFacturaGenerada(Boolean facturaGenerada) { this.facturaGenerada = facturaGenerada; }

    public Boolean getFacturaEnviadaWhatsapp() { return facturaEnviadaWhatsapp; }
    public void setFacturaEnviadaWhatsapp(Boolean facturaEnviadaWhatsapp) { this.facturaEnviadaWhatsapp = facturaEnviadaWhatsapp; }

    public String getNumeroGuia() { return numeroGuia; }
    public void setNumeroGuia(String numeroGuia) { this.numeroGuia = numeroGuia; }

    public String getUrlTracking() { return urlTracking; }
    public void setUrlTracking(String urlTracking) { this.urlTracking = urlTracking; }

    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
    public void setFechaEnvio(LocalDateTime fechaEnvio) { this.fechaEnvio = fechaEnvio; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Long getEmpresaId() { return empresa != null ? empresa.getId() : null; }

    public String getGrupoPago() { return grupoPago; }
    public void setGrupoPago(String grupoPago) { this.grupoPago = grupoPago; }

    @JsonIgnore
    public String getTokenSeguimiento() { return tokenSeguimiento; }
    public void setTokenSeguimiento(String tokenSeguimiento) { this.tokenSeguimiento = tokenSeguimiento; }

    @PrePersist
    void asegurarTokenSeguimiento() {
        if (tokenSeguimiento == null) tokenSeguimiento = TokenSeguimientoPedido.generar();
    }

    public Usuario getUsuarioFinal() { return usuarioFinal; }
    public void setUsuarioFinal(Usuario usuarioFinal) { this.usuarioFinal = usuarioFinal; }

    public Bodega getBodega() { return bodega; }
    public void setBodega(Bodega bodega) { this.bodega = bodega; }

    public List<PedidoItem> getItems() { return items; }
    public void setItems(List<PedidoItem> items) { this.items = items; }

    public Compra getCompra() { return compra; }
    public void setCompra(Compra compra) { this.compra = compra; }
    public Long getCompraId() { return compra != null ? compra.getId() : null; }

    // Solo lectura: devuelven null si la relación LAZY no se cargó dentro de la transacción.
    public String getNumeroCompra() { return cargado(compra) ? compra.getNumeroCompra() : null; }
    public Integer getCantidadPaquetes() { return cargado(compra) ? compra.getCantidadPaquetes() : null; }
    public String getNombreNegocio() {
        if (!cargado(empresa)) return null;
        String comercial = empresa.getNombreComercial();
        return comercial != null && !comercial.isBlank() ? comercial : empresa.getNombreEmpresa();
    }

    private static boolean cargado(Object relacion) {
        return relacion != null && Hibernate.isInitialized(relacion);
    }

    public Integer getNumeroPaquete() { return numeroPaquete; }
    public void setNumeroPaquete(Integer numeroPaquete) { this.numeroPaquete = numeroPaquete; }

    @JsonRawValue
    public String getNotificaciones() { return notificaciones != null ? notificaciones : "[]"; }
    @JsonSetter
    public void setNotificaciones(String notificaciones) { this.notificaciones = notificaciones; }

    public String getCuponCodigo() { return cuponCodigo; }
    public void setCuponCodigo(String cuponCodigo) { this.cuponCodigo = cuponCodigo; }

    public String getGiftCardCodigo() { return giftCardCodigo; }
    public void setGiftCardCodigo(String v) { this.giftCardCodigo = v; }
    public Integer getGiftCardMonto() { return giftCardMonto; }
    public void setGiftCardMonto(Integer v) { this.giftCardMonto = v; }

    public String getMesaNombre() { return mesaNombre; }
    public void setMesaNombre(String v) { this.mesaNombre = v; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String v) { this.clienteNombre = v; }
    public String getClienteTel() { return clienteTel; }
    public void setClienteTel(String v) { this.clienteTel = v; }
    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String v) { this.direccionEntrega = v; }
}
