package com.hotclick.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_transaccion_pago_tb")
public class TransaccionPago extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transaccion")
    private Long id;

    @Column(name = "payxpert_txn_id", length = 200)
    private String txnId;

    @Column(name = "error_code", nullable = false, length = 10)
    private String errorCode;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Column(name = "card_brand", length = 20)
    private String cardBrand;

    @Column(name = "tipo_operacion", nullable = false, length = 30)
    private String tipoOperacion;

    @Column(name = "monto_operacion", nullable = false)
    private Integer montoOperacion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_respuesta", columnDefinition = "jsonb")
    private String payloadRespuesta;

    @Column(name = "fecha_transaccion")
    private LocalDateTime fechaTransaccion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pago", nullable = false)
    private Pago pago;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTxnId() { return txnId; }
    public void setTxnId(String txnId) { this.txnId = txnId; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getCardLast4() { return cardLast4; }
    public void setCardLast4(String cardLast4) { this.cardLast4 = cardLast4; }

    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String cardBrand) { this.cardBrand = cardBrand; }

    public String getTipoOperacion() { return tipoOperacion; }
    public void setTipoOperacion(String tipoOperacion) { this.tipoOperacion = tipoOperacion; }

    public Integer getMontoOperacion() { return montoOperacion; }
    public void setMontoOperacion(Integer montoOperacion) { this.montoOperacion = montoOperacion; }

    public String getPayloadRespuesta() { return payloadRespuesta; }
    public void setPayloadRespuesta(String payloadRespuesta) { this.payloadRespuesta = payloadRespuesta; }

    public LocalDateTime getFechaTransaccion() { return fechaTransaccion; }
    public void setFechaTransaccion(LocalDateTime fechaTransaccion) { this.fechaTransaccion = fechaTransaccion; }

    public Pago getPago() { return pago; }
    public void setPago(Pago pago) { this.pago = pago; }
}
