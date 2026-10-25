package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** A3: bitácora de anulaciones y devoluciones POS (usuario, motivo y hora). */
@Entity
@Table(name = "hot_click_pos_anulacion_tb")
public class PosAnulacion {

    public static final String ANULACION = "ANULACION";
    public static final String DEVOLUCION = "DEVOLUCION";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_anulacion")
    private Long id;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo;

    @Column(name = "fk_id_pedido", nullable = false)
    private Long pedidoId;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "fk_id_turno")
    private Long turnoId;

    @Column(name = "estado_turno", length = 20)
    private String estadoTurno;

    @Column(name = "fk_id_usuario", nullable = false)
    private Long usuarioId;

    @Column(name = "rol_actor", nullable = false, length = 30)
    private String rolActor;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    @Column(name = "monto")
    private Integer monto;

    @Column(name = "fecha", nullable = false)
    private LocalDateTime fecha;

    public Long getId() { return id; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public Long getTurnoId() { return turnoId; }
    public void setTurnoId(Long turnoId) { this.turnoId = turnoId; }
    public String getEstadoTurno() { return estadoTurno; }
    public void setEstadoTurno(String estadoTurno) { this.estadoTurno = estadoTurno; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getRolActor() { return rolActor; }
    public void setRolActor(String rolActor) { this.rolActor = rolActor; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public Integer getMonto() { return monto; }
    public void setMonto(Integer monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
