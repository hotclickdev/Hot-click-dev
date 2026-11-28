package com.hotclick.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Marca un pedido cobrado en ONVO a nombre de una cuenta conectada con su marketplaceAppFee ya sincronizado.
 * ONVO retiene ese porcentaje: HotClick no vuelve a descontar comisión ni acredita el neto al wallet.
 */
@Entity
@Table(name = "hot_click_pedido_retencion_onvo_tb")
public class PedidoRetencionOnvo {

    /** ONVO retiene la comisión: no hay descuento manual ni acreditación al wallet. */
    public static final String RETENIDA = "RETENIDA";
    /** La sesión pagada no se pudo confirmar a nombre de la cuenta esperada: lo resuelve un ADMIN a mano. */
    public static final String POR_REVISAR = "POR_REVISAR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_retencion")
    private Long id;

    @Column(name = "fk_id_pedido", nullable = false, unique = true)
    private Long pedidoId;

    @Column(name = "onvo_account_id", nullable = false, length = 100)
    private String onvoAccountId;

    /** Sesión de checkout con la que se cobró; la confirmación del pago la contrasta con ONVO. */
    @Column(name = "onvo_session_id", length = 100)
    private String onvoSessionId;

    @Column(name = "estado", nullable = false, length = 12)
    private String estado = RETENIDA;

    @Column(name = "fee_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal feePct;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long v) { this.pedidoId = v; }
    public String getOnvoAccountId() { return onvoAccountId; }
    public void setOnvoAccountId(String v) { this.onvoAccountId = v; }
    public String getOnvoSessionId() { return onvoSessionId; }
    public void setOnvoSessionId(String v) { this.onvoSessionId = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public boolean porRevisar() { return POR_REVISAR.equals(estado); }
    public BigDecimal getFeePct() { return feePct; }
    public void setFeePct(BigDecimal v) { this.feePct = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
