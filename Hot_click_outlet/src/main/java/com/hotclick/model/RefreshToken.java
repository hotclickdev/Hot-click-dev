package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_refresh_token_tb")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public boolean isExpired()  { return LocalDateTime.now().isAfter(expiresAt); }
    public boolean isRevoked()  { return revokedAt != null; }
    public boolean isValid()    { return !isExpired() && !isRevoked(); }

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }
    public String getToken()                     { return token; }
    public void setToken(String token)           { this.token = token; }
    public Usuario getUsuario()                  { return usuario; }
    public void setUsuario(Usuario usuario)      { this.usuario = usuario; }
    public LocalDateTime getExpiresAt()          { return expiresAt; }
    public void setExpiresAt(LocalDateTime e)    { this.expiresAt = e; }
    public LocalDateTime getRevokedAt()          { return revokedAt; }
    public void setRevokedAt(LocalDateTime r)    { this.revokedAt = r; }
}
