package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Vinculación entre un usuario del panel y su cuenta de Telegram (bot de clientes).
 *
 * Ciclo de vida:
 *   PENDIENTE — el usuario generó un código desde Configuración, aún no hizo /start
 *   ACTIVA    — el bot recibió /start CODIGO y guardó el chat_id
 *   REVOCADA  — el usuario (o el propietario del negocio) cortó el acceso
 *
 * contexto guarda el estado conversacional pendiente: "AJUSTE:123" cuando el bot
 * espera la cantidad real de un producto del chequeo semanal, o un borrador JSON
 * (empieza con "{") de los flujos multi-paso de venta rápida / alta de producto.
 */
@Entity
@Table(name = "hot_click_telegram_vinculacion_tb")
public class TelegramVinculacion {

    public static final String PENDIENTE = "PENDIENTE";
    public static final String ACTIVA    = "ACTIVA";
    public static final String REVOCADA  = "REVOCADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_vinculacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "chat_id")
    private Long chatId;

    @Column(name = "telegram_username", length = 64)
    private String telegramUsername;

    @Column(name = "fk_id_empresa_activa")
    private Long empresaActivaId;

    @Column(name = "codigo", length = 16)
    private String codigo;

    @Column(name = "codigo_expira")
    private LocalDateTime codigoExpira;

    @Column(name = "contexto", columnDefinition = "TEXT")
    private String contexto;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = PENDIENTE;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "fecha_vinculacion")
    private LocalDateTime fechaVinculacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }

    public String getTelegramUsername() { return telegramUsername; }
    public void setTelegramUsername(String telegramUsername) { this.telegramUsername = telegramUsername; }

    public Long getEmpresaActivaId() { return empresaActivaId; }
    public void setEmpresaActivaId(Long empresaActivaId) { this.empresaActivaId = empresaActivaId; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public LocalDateTime getCodigoExpira() { return codigoExpira; }
    public void setCodigoExpira(LocalDateTime codigoExpira) { this.codigoExpira = codigoExpira; }

    public String getContexto() { return contexto; }
    public void setContexto(String contexto) { this.contexto = contexto; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaVinculacion() { return fechaVinculacion; }
    public void setFechaVinculacion(LocalDateTime fechaVinculacion) { this.fechaVinculacion = fechaVinculacion; }
}
