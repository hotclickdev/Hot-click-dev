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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_retencion")
    private Long id;

    @Column(name = "fk_id_pedido", nullable = false, unique = true)
    private Long pedidoId;

    @Column(name = "onvo_account_id", nullable = false, length = 100)
    private String onvoAccountId;

    @Column(name = "fee_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal feePct;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long v) { this.pedidoId = v; }
    public String getOnvoAccountId() { return onvoAccountId; }
    public void setOnvoAccountId(String v) { this.onvoAccountId = v; }
    public BigDecimal getFeePct() { return feePct; }
    public void setFeePct(BigDecimal v) { this.feePct = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
