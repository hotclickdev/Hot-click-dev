package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_atribucion_pedido_tb")
public class AtribucionPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_atribucion")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_pedido", nullable = false, unique = true)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @Column(name = "first_utm_source", length = 120)
    private String firstUtmSource;
    @Column(name = "first_utm_medium", length = 120)
    private String firstUtmMedium;
    @Column(name = "first_utm_campaign", length = 255)
    private String firstUtmCampaign;
    @Column(name = "first_utm_content", length = 255)
    private String firstUtmContent;
    @Column(name = "first_utm_term", length = 255)
    private String firstUtmTerm;
    @Column(name = "first_fbclid", length = 255)
    private String firstFbclid;
    @Column(name = "first_gclid", length = 255)
    private String firstGclid;
    @Column(name = "first_landing_path", length = 500)
    private String firstLandingPath;
    @Column(name = "first_touched_at")
    private LocalDateTime firstTouchedAt;

    @Column(name = "last_utm_source", length = 120)
    private String lastUtmSource;
    @Column(name = "last_utm_medium", length = 120)
    private String lastUtmMedium;
    @Column(name = "last_utm_campaign", length = 255)
    private String lastUtmCampaign;
    @Column(name = "last_utm_content", length = 255)
    private String lastUtmContent;
    @Column(name = "last_utm_term", length = 255)
    private String lastUtmTerm;
    @Column(name = "last_fbclid", length = 255)
    private String lastFbclid;
    @Column(name = "last_gclid", length = 255)
    private String lastGclid;
    @Column(name = "last_landing_path", length = 500)
    private String lastLandingPath;
    @Column(name = "last_touched_at")
    private LocalDateTime lastTouchedAt;

    @Column(name = "event_id_purchase", length = 100)
    private String eventIdPurchase;
    @Column(name = "fbp", length = 255)
    private String fbp;
    @Column(name = "fbc", length = 255)
    private String fbc;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getFirstUtmSource() { return firstUtmSource; }
    public void setFirstUtmSource(String firstUtmSource) { this.firstUtmSource = firstUtmSource; }
    public String getFirstUtmMedium() { return firstUtmMedium; }
    public void setFirstUtmMedium(String firstUtmMedium) { this.firstUtmMedium = firstUtmMedium; }
    public String getFirstUtmCampaign() { return firstUtmCampaign; }
    public void setFirstUtmCampaign(String firstUtmCampaign) { this.firstUtmCampaign = firstUtmCampaign; }
    public String getFirstUtmContent() { return firstUtmContent; }
    public void setFirstUtmContent(String firstUtmContent) { this.firstUtmContent = firstUtmContent; }
    public String getFirstUtmTerm() { return firstUtmTerm; }
    public void setFirstUtmTerm(String firstUtmTerm) { this.firstUtmTerm = firstUtmTerm; }
    public String getFirstFbclid() { return firstFbclid; }
    public void setFirstFbclid(String firstFbclid) { this.firstFbclid = firstFbclid; }
    public String getFirstGclid() { return firstGclid; }
    public void setFirstGclid(String firstGclid) { this.firstGclid = firstGclid; }
    public String getFirstLandingPath() { return firstLandingPath; }
    public void setFirstLandingPath(String firstLandingPath) { this.firstLandingPath = firstLandingPath; }
    public LocalDateTime getFirstTouchedAt() { return firstTouchedAt; }
    public void setFirstTouchedAt(LocalDateTime firstTouchedAt) { this.firstTouchedAt = firstTouchedAt; }

    public String getLastUtmSource() { return lastUtmSource; }
    public void setLastUtmSource(String lastUtmSource) { this.lastUtmSource = lastUtmSource; }
    public String getLastUtmMedium() { return lastUtmMedium; }
    public void setLastUtmMedium(String lastUtmMedium) { this.lastUtmMedium = lastUtmMedium; }
    public String getLastUtmCampaign() { return lastUtmCampaign; }
    public void setLastUtmCampaign(String lastUtmCampaign) { this.lastUtmCampaign = lastUtmCampaign; }
    public String getLastUtmContent() { return lastUtmContent; }
    public void setLastUtmContent(String lastUtmContent) { this.lastUtmContent = lastUtmContent; }
    public String getLastUtmTerm() { return lastUtmTerm; }
    public void setLastUtmTerm(String lastUtmTerm) { this.lastUtmTerm = lastUtmTerm; }
    public String getLastFbclid() { return lastFbclid; }
    public void setLastFbclid(String lastFbclid) { this.lastFbclid = lastFbclid; }
    public String getLastGclid() { return lastGclid; }
    public void setLastGclid(String lastGclid) { this.lastGclid = lastGclid; }
    public String getLastLandingPath() { return lastLandingPath; }
    public void setLastLandingPath(String lastLandingPath) { this.lastLandingPath = lastLandingPath; }
    public LocalDateTime getLastTouchedAt() { return lastTouchedAt; }
    public void setLastTouchedAt(LocalDateTime lastTouchedAt) { this.lastTouchedAt = lastTouchedAt; }

    public String getEventIdPurchase() { return eventIdPurchase; }
    public void setEventIdPurchase(String eventIdPurchase) { this.eventIdPurchase = eventIdPurchase; }
    public String getFbp() { return fbp; }
    public void setFbp(String fbp) { this.fbp = fbp; }
    public String getFbc() { return fbc; }
    public void setFbc(String fbc) { this.fbc = fbc; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    /** Campaña efectiva para reportes: last touch, fallback first. */
    public String campanaEfectiva() {
        if (lastUtmCampaign != null && !lastUtmCampaign.isBlank()) return lastUtmCampaign;
        if (firstUtmCampaign != null && !firstUtmCampaign.isBlank()) return firstUtmCampaign;
        if (lastUtmSource != null && !lastUtmSource.isBlank()) return lastUtmSource;
        if (firstUtmSource != null && !firstUtmSource.isBlank()) return firstUtmSource;
        return "directo";
    }
}
