package com.hotclick.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "hot_click_consentimiento_log_tb")
public class ConsentimientoLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(nullable = false, length = 30)
    private String tipo; // REGISTRO | CHECKOUT | VENDEDOR

    @Column(name = "version_doc", nullable = false, length = 20)
    private String versionDoc = "2025-06-05";

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(nullable = false)
    private Boolean aceptado = true;

    @Column(name = "fecha_consentimiento", nullable = false, updatable = false)
    private Instant fechaConsentimiento = Instant.now();

    protected ConsentimientoLog() {}

    public ConsentimientoLog(Long usuarioId, String tipo, String ipAddress, String userAgent) {
        this.usuarioId = usuarioId;
        this.tipo      = tipo;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }

    public Long getId()                          { return id; }
    public Long getUsuarioId()                   { return usuarioId; }
    public String getTipo()                      { return tipo; }
    public String getVersionDoc()                { return versionDoc; }
    public String getIpAddress()                 { return ipAddress; }
    public String getUserAgent()                 { return userAgent; }
    public Boolean getAceptado()                 { return aceptado; }
    public Instant getFechaConsentimiento()      { return fechaConsentimiento; }
}
