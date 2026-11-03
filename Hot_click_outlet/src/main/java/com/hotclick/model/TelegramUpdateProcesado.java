package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** TG3: update_id de Telegram ya tomado para procesar (dedup persistente, sobrevive reinicios). */
@Entity
@Table(name = "hot_click_telegram_update_procesado_tb")
public class TelegramUpdateProcesado {

    @Id
    @Column(name = "update_id", nullable = false)
    private Long updateId;

    @Column(name = "creado", nullable = false)
    private LocalDateTime creado;

    protected TelegramUpdateProcesado() {}

    public Long getUpdateId() { return updateId; }
    public LocalDateTime getCreado() { return creado; }
}
