package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Dead-Letter Queue para acreditaciones de venta que fallaron en el hilo @Async.
 *
 * Cuando AggregatorService no puede acreditar el wallet de un emprendedor
 * (BD caída, timeout, etc.), el evento se persiste aquí.
 * WalletReconciliacionScheduler lo reintenta con backoff exponencial.
 *
 * El campo fk_id_pedido tiene UNIQUE constraint — garantiza que el mismo pedido
 * no pueda encolarse dos veces en la DLQ aunque falle varias veces seguidas.
 */
@Entity
@Table(name = "hot_click_wallet_dlq_tb")
public class WalletAcreditacionFallida {

    public static final String PENDIENTE_REINTENTO = "PENDIENTE_REINTENTO";
    public static final String PROCESADO           = "PROCESADO";
    public static final String AGOTADO             = "AGOTADO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_dlq")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "fk_id_pedido", nullable = false, unique = true)
    private Long pedidoId;

    @Column(name = "total_bruto", nullable = false)
    private Long totalBruto;

    @Column(name = "com_saas", nullable = false)
    private Long comSaas;

    @Column(name = "com_gw", nullable = false)
    private Long comGw;

    @Column(name = "monto_neto", nullable = false)
    private Long montoNeto;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = PENDIENTE_REINTENTO;

    @Column(name = "intentos", nullable = false)
    private Integer intentos = 0;

    @Column(name = "max_intentos", nullable = false)
    private Integer maxIntentos = 10;

    @Column(name = "ultimo_error", columnDefinition = "TEXT")
    private String ultimoError;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_proximo_intento", nullable = false)
    private LocalDateTime fechaProximoIntento = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_completado")
    private LocalDateTime fechaCompletado;

    public Long getId()                             { return id; }
    public void setId(Long v)                       { this.id = v; }

    public Long getEmpresaId()                      { return empresaId; }
    public void setEmpresaId(Long v)                { this.empresaId = v; }

    public Long getPedidoId()                       { return pedidoId; }
    public void setPedidoId(Long v)                 { this.pedidoId = v; }

    public Long getTotalBruto()                     { return totalBruto; }
    public void setTotalBruto(Long v)               { this.totalBruto = v; }

    public Long getComSaas()                        { return comSaas; }
    public void setComSaas(Long v)                  { this.comSaas = v; }

    public Long getComGw()                          { return comGw; }
    public void setComGw(Long v)                    { this.comGw = v; }

    public Long getMontoNeto()                      { return montoNeto; }
    public void setMontoNeto(Long v)                { this.montoNeto = v; }

    public String getEstado()                       { return estado; }
    public void setEstado(String v)                 { this.estado = v; }

    public Integer getIntentos()                    { return intentos; }
    public void setIntentos(Integer v)              { this.intentos = v; }

    public Integer getMaxIntentos()                 { return maxIntentos; }
    public void setMaxIntentos(Integer v)           { this.maxIntentos = v; }

    public String getUltimoError()                  { return ultimoError; }
    public void setUltimoError(String v)            { this.ultimoError = v; }

    public LocalDateTime getFechaCreacion()         { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime v)   { this.fechaCreacion = v; }

    public LocalDateTime getFechaProximoIntento()         { return fechaProximoIntento; }
    public void setFechaProximoIntento(LocalDateTime v)   { this.fechaProximoIntento = v; }

    public LocalDateTime getFechaCompletado()       { return fechaCompletado; }
    public void setFechaCompletado(LocalDateTime v) { this.fechaCompletado = v; }
}
