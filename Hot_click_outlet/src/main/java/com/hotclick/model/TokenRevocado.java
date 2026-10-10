package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Entrada de la denylist de JWT por jti (V165). */
@Entity
@Table(name = "hot_click_token_revocado_tb")
public class TokenRevocado {

    @Id
    @Column(name = "jti", length = 64)
    private String jti;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(name = "motivo", nullable = false, length = 40)
    private String motivo;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    public TokenRevocado() {}

    public TokenRevocado(String jti, LocalDateTime expiraEn, String motivo, LocalDateTime creadoEn) {
        this.jti = jti;
        this.expiraEn = expiraEn;
        this.motivo = motivo;
        this.creadoEn = creadoEn;
    }

    public String getJti() { return jti; }
    public LocalDateTime getExpiraEn() { return expiraEn; }
    public String getMotivo() { return motivo; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
