package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_ip_bloqueada_tb")
public class IpBloqueada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ip_bloqueada")
    private Long id;

    @Column(name = "ip_address", nullable = false, unique = true, length = 50)
    private String ipAddress;

    @Column(name = "motivo", length = 500)
    private String motivo;

    @Column(name = "bloqueada_por", length = 150)
    private String bloqueadaPor;

    @Column(name = "fecha_bloqueo", nullable = false)
    private LocalDateTime fechaBloqueo = LocalDateTime.now();

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "activa", nullable = false)
    private Boolean activa = true;

    public Long getId() { return id; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getBloqueadaPor() { return bloqueadaPor; }
    public void setBloqueadaPor(String bloqueadaPor) { this.bloqueadaPor = bloqueadaPor; }
    public LocalDateTime getFechaBloqueo() { return fechaBloqueo; }
    public void setFechaBloqueo(LocalDateTime fechaBloqueo) { this.fechaBloqueo = fechaBloqueo; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }
}
