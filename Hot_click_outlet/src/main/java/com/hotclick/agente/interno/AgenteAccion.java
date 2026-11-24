package com.hotclick.agente.interno;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Bitácora (AG-21) de lo que el bot interno hizo en nombre de un usuario. Solo ids y códigos: nunca datos del
 * cliente final, teléfonos ni texto de la conversación. Retención de 90 días en DataRetentionScheduler.
 */
@Entity
@Table(name = "hot_click_agente_accion_tb")
public class AgenteAccion {

    public static final String EJECUTADA = "EJECUTADA";
    public static final String CANCELADA = "CANCELADA";
    public static final String RECHAZADA = "RECHAZADA";
    public static final String ERROR = "ERROR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_accion")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "fk_id_usuario")
    private Long usuarioId;

    @Column(name = "canal", nullable = false, length = 20)
    private String canal = AgenteVinculacion.CANAL_WHATSAPP;

    @Column(name = "accion", nullable = false, length = 40)
    private String accion;

    @Column(name = "resultado", nullable = false, length = 20)
    private String resultado;

    @Column(name = "entidad_id")
    private Long entidadId;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion = Instant.now();

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { this.empresaId = v; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long v) { this.usuarioId = v; }
    public String getCanal() { return canal; }
    public String getAccion() { return accion; }
    public void setAccion(String v) { this.accion = v; }
    public String getResultado() { return resultado; }
    public void setResultado(String v) { this.resultado = v; }
    public Long getEntidadId() { return entidadId; }
    public void setEntidadId(Long v) { this.entidadId = v; }
    public Instant getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(Instant v) { this.fechaCreacion = v; }
}
