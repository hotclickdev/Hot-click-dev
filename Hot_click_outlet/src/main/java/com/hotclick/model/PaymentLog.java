package com.hotclick.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_payment_log_tb")
public class PaymentLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Long id;

    @Column(name = "accion", nullable = false, length = 50)
    private String accion;

    @Column(name = "url_llamada", nullable = false, length = 500)
    private String urlLlamada;

    @Column(name = "http_method", nullable = false, length = 10)
    private String httpMethod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_body", columnDefinition = "jsonb")
    private String requestBody;

    @Column(name = "response_code")
    private Integer responseCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_body", columnDefinition = "jsonb")
    private String responseBody;

    @Column(name = "duracion_ms")
    private Integer duracionMs;

    @Column(name = "exitoso")
    private Boolean exitoso = false;

    @Column(name = "fecha_log")
    private LocalDateTime fechaLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pago")
    private Pago pago;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario")
    private Usuario usuario;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }

    public String getUrlLlamada() { return urlLlamada; }
    public void setUrlLlamada(String urlLlamada) { this.urlLlamada = urlLlamada; }

    public String getHttpMethod() { return httpMethod; }
    public void setHttpMethod(String httpMethod) { this.httpMethod = httpMethod; }

    public String getRequestBody() { return requestBody; }
    public void setRequestBody(String requestBody) { this.requestBody = requestBody; }

    public Integer getResponseCode() { return responseCode; }
    public void setResponseCode(Integer responseCode) { this.responseCode = responseCode; }

    public String getResponseBody() { return responseBody; }
    public void setResponseBody(String responseBody) { this.responseBody = responseBody; }

    public Integer getDuracionMs() { return duracionMs; }
    public void setDuracionMs(Integer duracionMs) { this.duracionMs = duracionMs; }

    public Boolean getExitoso() { return exitoso; }
    public void setExitoso(Boolean exitoso) { this.exitoso = exitoso; }

    public LocalDateTime getFechaLog() { return fechaLog; }
    public void setFechaLog(LocalDateTime fechaLog) { this.fechaLog = fechaLog; }

    public Pago getPago() { return pago; }
    public void setPago(Pago pago) { this.pago = pago; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
