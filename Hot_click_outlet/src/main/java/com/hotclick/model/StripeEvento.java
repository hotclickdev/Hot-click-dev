package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Tabla de idempotencia para webhooks Stripe. PK = stripe_event_id. */
@Entity
@Table(name = "hot_click_stripe_evento_tb")
public class StripeEvento {

    @Id
    @Column(name = "stripe_event_id", length = 100)
    private String stripeEventId;

    @Column(name = "tipo", length = 100)
    private String tipo;

    @Column(name = "procesado_ok", nullable = false)
    private Boolean procesadoOk = false;

    @Column(name = "fecha_recibido", nullable = false)
    private LocalDateTime fechaRecibido = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_procesado")
    private LocalDateTime fechaProcesado;

    @Column(name = "error")
    private String error;

    public String getStripeEventId() { return stripeEventId; }
    public void setStripeEventId(String v) { this.stripeEventId = v; }
    public String getTipo() { return tipo; }
    public void setTipo(String v) { this.tipo = v; }
    public Boolean getProcesadoOk() { return procesadoOk; }
    public void setProcesadoOk(Boolean v) { this.procesadoOk = v; }
    public LocalDateTime getFechaRecibido() { return fechaRecibido; }
    public LocalDateTime getFechaProcesado() { return fechaProcesado; }
    public void setFechaProcesado(LocalDateTime v) { this.fechaProcesado = v; }
    public String getError() { return error; }
    public void setError(String v) { this.error = v; }
}
