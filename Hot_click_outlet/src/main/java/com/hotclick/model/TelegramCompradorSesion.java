package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Sesión de un COMPRADOR en el bot de Telegram de la tienda (chat NO vinculado a una cuenta del panel).
 * Guarda la empresa (tienda) activa, el paso del flujo y el carrito/datos en JSON. Nunca guarda tarjetas.
 */
@Entity
@Table(name = "hot_click_telegram_comprador_sesion_tb")
public class TelegramCompradorSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sesion")
    private Long id;

    @Column(name = "chat_id", nullable = false, unique = true)
    private Long chatId;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "paso", nullable = false, length = 30)
    private String paso;

    @Column(name = "contexto", columnDefinition = "TEXT")
    private String contexto;

    @Column(name = "fk_id_pedido")
    private Long pedidoId;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "ultima_actividad", nullable = false)
    private LocalDateTime ultimaActividad;

    public Long getId() { return id; }
    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getPaso() { return paso; }
    public void setPaso(String paso) { this.paso = paso; }
    public String getContexto() { return contexto; }
    public void setContexto(String contexto) { this.contexto = contexto; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getUltimaActividad() { return ultimaActividad; }
    public void setUltimaActividad(LocalDateTime ultimaActividad) { this.ultimaActividad = ultimaActividad; }
}
