package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_split_pago_tb")
public class SplitPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_split")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pedido", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_gift_card")
    private GiftCard giftCard;

    /** GIFT_CARD | SINPE | PAYPAL | EFECTIVO | STRIPE | TRANSFERENCIA */
    @Column(name = "tipo", nullable = false, length = 30)
    private String tipo;

    @Column(name = "monto", nullable = false)
    private Integer monto;

    @Column(name = "referencia", length = 200)
    private String referencia;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    @PrePersist
    void onCreate() {
        fechaPago = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public GiftCard getGiftCard() { return giftCard; }
    public void setGiftCard(GiftCard giftCard) { this.giftCard = giftCard; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Integer getMonto() { return monto; }
    public void setMonto(Integer monto) { this.monto = monto; }

    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }

    public LocalDateTime getFechaPago() { return fechaPago; }
}
