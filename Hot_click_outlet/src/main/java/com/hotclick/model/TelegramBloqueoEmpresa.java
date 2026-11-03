package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** N1 (área 8): el usuario no puede usar el bot de Telegram para esta empresa; la web sigue igual. */
@Entity
@Table(name = "hot_click_telegram_bloqueo_empresa_tb",
    uniqueConstraints = @UniqueConstraint(name = "uq_tg_bloqueo_usuario_empresa", columnNames = {"usuario_id", "empresa_id"}))
public class TelegramBloqueoEmpresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "creado", nullable = false)
    private LocalDateTime creado;

    @Column(name = "creado_por")
    private Long creadoPor;

    protected TelegramBloqueoEmpresa() {}

    public TelegramBloqueoEmpresa(Long usuarioId, Long empresaId, LocalDateTime creado, Long creadoPor) {
        this.usuarioId = usuarioId;
        this.empresaId = empresaId;
        this.creado = creado;
        this.creadoPor = creadoPor;
    }

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public Long getEmpresaId() { return empresaId; }
    public LocalDateTime getCreado() { return creado; }
    public Long getCreadoPor() { return creadoPor; }
}
