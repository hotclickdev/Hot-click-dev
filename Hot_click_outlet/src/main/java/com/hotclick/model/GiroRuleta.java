package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_giro_ruleta_tb")
public class GiroRuleta extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_giro")
    private Long id;

    @Column(name = "tipo_origen", nullable = false, length = 30)
    private String tipoOrigen;

    @Column(name = "usado")
    private Boolean usado = false;

    @Column(name = "fecha_asignacion")
    private LocalDateTime fechaAsignacion;

    @Column(name = "fecha_uso")
    private LocalDateTime fechaUso;

    @ManyToOne
    @JoinColumn(name = "fk_id_usuario_final", nullable = false)
    private Usuario usuarioFinal;

    @ManyToOne
    @JoinColumn(name = "fk_id_pedido")
    private Pedido pedido;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTipoOrigen() { return tipoOrigen; }
    public void setTipoOrigen(String tipoOrigen) { this.tipoOrigen = tipoOrigen; }

    public Boolean getUsado() { return usado; }
    public void setUsado(Boolean usado) { this.usado = usado; }

    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime fechaAsignacion) { this.fechaAsignacion = fechaAsignacion; }

    public LocalDateTime getFechaUso() { return fechaUso; }
    public void setFechaUso(LocalDateTime fechaUso) { this.fechaUso = fechaUso; }

    public Usuario getUsuarioFinal() { return usuarioFinal; }
    public void setUsuarioFinal(Usuario usuarioFinal) { this.usuarioFinal = usuarioFinal; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }
}
