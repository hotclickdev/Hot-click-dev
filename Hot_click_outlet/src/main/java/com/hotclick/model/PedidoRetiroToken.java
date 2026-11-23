package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Token opaco de retiro en tienda de un pedido pagado por Telegram. Un solo uso; vence a las 4 h del pago.
 * El token no codifica ningún dato del pedido: todo vive en el servidor.
 */
@Entity
@Table(name = "hot_click_pedido_retiro_token_tb")
public class PedidoRetiroToken {

    public static final String PENDIENTE  = "PENDIENTE";
    public static final String PRESENTADO = "PRESENTADO";
    public static final String VENCIDO    = "VENCIDO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_retiro_token")
    private Long id;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "fk_id_pedido", nullable = false, unique = true)
    private Long pedidoId;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "estado", nullable = false, length = 15)
    private String estado = PENDIENTE;

    @Column(name = "expira", nullable = false)
    private LocalDateTime expira;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_canje")
    private LocalDateTime fechaCanje;

    @Column(name = "fk_id_usuario_canje")
    private Long usuarioCanjeId;

    public Long getId() { return id; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getExpira() { return expira; }
    public void setExpira(LocalDateTime expira) { this.expira = expira; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaCanje() { return fechaCanje; }
    public void setFechaCanje(LocalDateTime fechaCanje) { this.fechaCanje = fechaCanje; }
    public Long getUsuarioCanjeId() { return usuarioCanjeId; }
    public void setUsuarioCanjeId(Long usuarioCanjeId) { this.usuarioCanjeId = usuarioCanjeId; }
}
