package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_webauthn_credential_tb")
public class WebAuthnCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_credential")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Usuario usuario;

    @Column(name = "credential_id", nullable = false, unique = true, columnDefinition = "TEXT")
    private String credentialId;  // Base64URL

    @Column(name = "public_key_cose", nullable = false, columnDefinition = "TEXT")
    private String publicKeyCose; // Base64URL de la clave pública COSE

    @Column(name = "sign_count", nullable = false)
    private long signCount;

    @Column(name = "aaguid")
    private String aaguid;

    @Column(name = "transports")
    private String transports;    // JSON array serializado

    @Column(name = "device_name", length = 200)
    private String deviceName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    public Long getId()                         { return id; }
    public Usuario getUsuario()                 { return usuario; }
    public void setUsuario(Usuario u)           { this.usuario = u; }
    public String getCredentialId()             { return credentialId; }
    public void setCredentialId(String s)       { this.credentialId = s; }
    public String getPublicKeyCose()            { return publicKeyCose; }
    public void setPublicKeyCose(String s)      { this.publicKeyCose = s; }
    public long getSignCount()                  { return signCount; }
    public void setSignCount(long n)            { this.signCount = n; }
    public String getAaguid()                   { return aaguid; }
    public void setAaguid(String s)             { this.aaguid = s; }
    public String getTransports()               { return transports; }
    public void setTransports(String s)         { this.transports = s; }
    public String getDeviceName()               { return deviceName; }
    public void setDeviceName(String s)         { this.deviceName = s; }
    public LocalDateTime getCreatedAt()         { return createdAt; }
    public LocalDateTime getLastUsedAt()        { return lastUsedAt; }
    public void setLastUsedAt(LocalDateTime t)  { this.lastUsedAt = t; }
}
