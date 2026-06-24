package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Cola de contingencia (dead-letter) para comprobantes que agotaron sus
 * reintentos rápidos en FacturacionService y quedaron en ESTADO_ERROR.
 * FacturacionContingenciaScheduler la reintenta con backoff lento hasta
 * que Hacienda se restablece, sin competir con el polling normal.
 */
@Entity
@Table(name = "hot_click_cola_facturacion_offline_tb")
public class ColaFacturacionOffline {

    public static final String ESTADO_PENDIENTE  = "PENDIENTE";
    public static final String ESTADO_PROCESANDO = "PROCESANDO";
    public static final String ESTADO_COMPLETADO  = "COMPLETADO";
    public static final String ESTADO_AGOTADO    = "AGOTADO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cola_offline")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "fk_id_comprobante", nullable = false)
    private Long comprobanteId;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = ESTADO_PENDIENTE;

    @Column(name = "intentos", nullable = false)
    private Integer intentos = 0;

    @Column(name = "max_intentos", nullable = false)
    private Integer maxIntentos = 12;

    @Column(name = "ultimo_error", columnDefinition = "TEXT")
    private String ultimoError;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_proximo_intento", nullable = false)
    private LocalDateTime fechaProximoIntento = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_inicio_proceso")
    private LocalDateTime fechaInicioProceso;

    @Column(name = "fecha_completado")
    private LocalDateTime fechaCompletado;

    // ── getters/setters ──────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }

    public Long getComprobanteId() { return comprobanteId; }
    public void setComprobanteId(Long comprobanteId) { this.comprobanteId = comprobanteId; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Integer getIntentos() { return intentos; }
    public void setIntentos(Integer intentos) { this.intentos = intentos; }

    public Integer getMaxIntentos() { return maxIntentos; }
    public void setMaxIntentos(Integer maxIntentos) { this.maxIntentos = maxIntentos; }

    public String getUltimoError() { return ultimoError; }
    public void setUltimoError(String ultimoError) { this.ultimoError = ultimoError; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaProximoIntento() { return fechaProximoIntento; }
    public void setFechaProximoIntento(LocalDateTime fechaProximoIntento) { this.fechaProximoIntento = fechaProximoIntento; }

    public LocalDateTime getFechaInicioProceso() { return fechaInicioProceso; }
    public void setFechaInicioProceso(LocalDateTime fechaInicioProceso) { this.fechaInicioProceso = fechaInicioProceso; }

    public LocalDateTime getFechaCompletado() { return fechaCompletado; }
    public void setFechaCompletado(LocalDateTime fechaCompletado) { this.fechaCompletado = fechaCompletado; }
}
