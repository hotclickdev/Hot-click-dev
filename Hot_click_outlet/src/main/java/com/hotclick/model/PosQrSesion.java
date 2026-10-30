package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_pos_qr_sesion_tb")
public class PosQrSesion {
    /** Cobrada sin stock para entregar: sin pedido, no es venta, hay que reembolsar. */
    public static final String ESTADO_REEMBOLSO_PENDIENTE = "REEMBOLSO_PENDIENTE";


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_qr_sesion")
    private Long id;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_turno")
    private TurnoCaja turno;

    @Column(name = "items_json", nullable = false, columnDefinition = "TEXT")
    private String itemsJson;

    @Column(name = "total", nullable = false)
    private Integer total;

    /** M4: el cliente pidió factura electrónica; en régimen simplificado el total ya incluye el IVA. */
    @Column(name = "factura_electronica", nullable = false)
    private boolean facturaElectronica = false;

    /** M4: IVA incluido en {@code total} (0 si es tiquete o régimen tradicional). */
    @Column(name = "monto_impuesto", nullable = false)
    private Integer montoImpuesto = 0;

    @Column(name = "metodo_pago", nullable = false, length = 20)
    private String metodoPago;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "PENDIENTE";

    @Column(name = "fk_id_pedido")
    private Long pedidoId;

    @Column(name = "stripe_session_id", length = 255)
    private String stripeSessionId;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "fk_id_cliente")
    private Long clienteId;

    @Column(name = "fk_id_bodega")
    private Long bodegaId;

    /** Métodos que la caja deja elegir al cliente (CSV: "SINPE,TARJETA"). Null = solo metodoPago. */
    @Column(name = "metodos_habilitados", length = 40)
    private String metodosHabilitados;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    /** ALTO 2: la sesión tiene unidades reservadas en {@code stock_reservado} del producto. */
    @Column(name = "stock_reservado", nullable = false)
    private boolean stockReservado = false;

    @Column(name = "reserva_expira")
    private LocalDateTime reservaExpira;

    /** ALTO 2: se cobró pero no había stock al confirmar; no hay pedido y hay que reembolsar. */
    @Column(name = "reembolso_pendiente", nullable = false)
    private boolean reembolsoPendiente = false;

    /** eventId del webhook ONVO que cerró la sesión: idempotencia ante reenvíos. */
    @Column(name = "onvo_evento_id", length = 100, unique = true)
    private String onvoEventoId;

    public boolean isStockReservado() { return stockReservado; }
    public void setStockReservado(boolean stockReservado) { this.stockReservado = stockReservado; }
    public LocalDateTime getReservaExpira() { return reservaExpira; }
    public void setReservaExpira(LocalDateTime reservaExpira) { this.reservaExpira = reservaExpira; }
    public boolean isReembolsoPendiente() { return reembolsoPendiente; }
    public void setReembolsoPendiente(boolean reembolsoPendiente) { this.reembolsoPendiente = reembolsoPendiente; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public TurnoCaja getTurno() { return turno; }
    public void setTurno(TurnoCaja turno) { this.turno = turno; }
    public String getItemsJson() { return itemsJson; }
    public void setItemsJson(String itemsJson) { this.itemsJson = itemsJson; }
    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String stripeSessionId) { this.stripeSessionId = stripeSessionId; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDateTime fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public Long getBodegaId() { return bodegaId; }
    public void setBodegaId(Long bodegaId) { this.bodegaId = bodegaId; }
    public String getMetodosHabilitados() { return metodosHabilitados; }
    public void setMetodosHabilitados(String metodosHabilitados) { this.metodosHabilitados = metodosHabilitados; }
    public LocalDateTime getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDateTime fechaPago) { this.fechaPago = fechaPago; }
    public String getOnvoEventoId() { return onvoEventoId; }
    public void setOnvoEventoId(String onvoEventoId) { this.onvoEventoId = onvoEventoId; }

    public boolean isFacturaElectronica() { return facturaElectronica; }
    public void setFacturaElectronica(boolean v) { this.facturaElectronica = v; }
    public Integer getMontoImpuesto() { return montoImpuesto != null ? montoImpuesto : 0; }
    public void setMontoImpuesto(Integer v) { this.montoImpuesto = v; }
}
