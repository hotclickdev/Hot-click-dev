package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_refresh_token_tb")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** SHA-256 hex del token opaco. Nunca guardar el valor en claro. */
    @Column(nullable = false, unique = true, length = 255)
    private String token;

    /** Valor en claro recién emitido; no se persiste (solo para Set-Cookie / AuthResponse). */
    @Transient
    private String rawToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public boolean isExpired()  { return LocalDateTime.now(Constants.ZONA_CR).isAfter(expiresAt); }
    public boolean isRevoked()  { return revokedAt != null; }
    public boolean isValid()    { return !isExpired() && !isRevoked(); }

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }
    public String getToken()                     { return token; }
    public void setToken(String token)           { this.token = token; }
    public String getRawToken()                  { return rawToken; }
    public void setRawToken(String rawToken)     { this.rawToken = rawToken; }
    public Usuario getUsuario()                  { return usuario; }
    public void setUsuario(Usuario usuario)      { this.usuario = usuario; }
    public LocalDateTime getExpiresAt()          { return expiresAt; }
    public void setExpiresAt(LocalDateTime e)    { this.expiresAt = e; }
    public LocalDateTime getRevokedAt()          { return revokedAt; }
    public void setRevokedAt(LocalDateTime r)    { this.revokedAt = r; }
}
