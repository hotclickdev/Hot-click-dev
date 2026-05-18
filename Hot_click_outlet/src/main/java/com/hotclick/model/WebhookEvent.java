package com.hotclick.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "hot_click_webhook_event_tb",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_webhook_token_tipo",
        columnNames = {"merchant_token", "evento_tipo"}
    )
)
public class WebhookEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_webhook_event")
    private Long id;

    @Column(name = "merchant_token", nullable = false, length = 500)
    private String merchantToken;

    @Column(name = "evento_tipo", nullable = false, length = 50)
    private String eventoTipo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_raw", columnDefinition = "jsonb", nullable = false)
    private String payloadRaw;

    @Column(name = "procesado")
    private Boolean procesado = false;

    @Column(name = "procesado_en")
    private LocalDateTime procesadoEn;

    @Column(name = "error_procesamiento")
    private String errorProcesamiento;

    @Column(name = "ip_origen", length = 45)
    private String ipOrigen;

    @Column(name = "fecha_recepcion")
    private LocalDateTime fechaRecepcion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMerchantToken() { return merchantToken; }
    public void setMerchantToken(String merchantToken) { this.merchantToken = merchantToken; }

    public String getEventoTipo() { return eventoTipo; }
    public void setEventoTipo(String eventoTipo) { this.eventoTipo = eventoTipo; }

    public String getPayloadRaw() { return payloadRaw; }
    public void setPayloadRaw(String payloadRaw) { this.payloadRaw = payloadRaw; }

    public Boolean getProcesado() { return procesado; }
    public void setProcesado(Boolean procesado) { this.procesado = procesado; }

    public LocalDateTime getProcesadoEn() { return procesadoEn; }
    public void setProcesadoEn(LocalDateTime procesadoEn) { this.procesadoEn = procesadoEn; }

    public String getErrorProcesamiento() { return errorProcesamiento; }
    public void setErrorProcesamiento(String errorProcesamiento) { this.errorProcesamiento = errorProcesamiento; }

    public String getIpOrigen() { return ipOrigen; }
    public void setIpOrigen(String ipOrigen) { this.ipOrigen = ipOrigen; }

    public LocalDateTime getFechaRecepcion() { return fechaRecepcion; }
    public void setFechaRecepcion(LocalDateTime fechaRecepcion) { this.fechaRecepcion = fechaRecepcion; }
}
