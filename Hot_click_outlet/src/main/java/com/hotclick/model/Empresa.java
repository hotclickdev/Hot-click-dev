package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_empresa_tb")
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empresa")
    private Long id;

    @Column(name = "nombre_empresa", nullable = false, length = 200)
    private String nombreEmpresa;

    @Column(name = "nombre_comercial", length = 200)
    private String nombreComercial;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "ruc_cedula", length = 30)
    private String rucCedula;

    @Column(name = "correo_empresa", nullable = false, unique = true, length = 150)
    private String correoEmpresa;

    @Column(name = "telefono_empresa", length = 30)
    private String telefonoEmpresa;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "color_primario", length = 7)
    private String colorPrimario = "#E73B33";

    @Column(name = "color_secundario", length = 7)
    private String colorSecundario = "#152B5E";

    @Column(name = "moneda_defecto", length = 3)
    private String monedaDefecto = "CRC";

    @Column(name = "pais_operacion", length = 3)
    private String paisOperacion = "CRC";

    @Column(name = "plan_saas", nullable = false, length = 30)
    private String planSaas = "GRATUITO";

    @Column(name = "estado_empresa", nullable = false, length = 20)
    private String estadoEmpresa = "ACTIVO";

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_aprobacion")
    private LocalDateTime fechaAprobacion;

    @Column(name = "numero_whatsapp", length = 30)
    private String numeroWhatsapp;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "visibilidad_publica", nullable = false)
    private Boolean visibilidadPublica = true;

    @Column(name = "fk_id_estado", nullable = false)
    private Integer estado = 1;

    // ── Configuración fiscal Hacienda CR (F12) ────────────────────────────────

    @Column(name = "cedula_juridica", length = 20)
    private String cedulaJuridica;

    /** '01'=Física, '02'=Jurídica */
    @Column(name = "tipo_cedula", length = 2)
    private String tipoCedula = "02";

    @Column(name = "actividad_economica", length = 10)
    private String actividadEconomica;

    @Column(name = "nombre_comercial_fe", length = 200)
    private String nombreComercialFe;

    @Column(name = "usuario_hacienda", length = 100)
    private String usuarioHacienda;

    /** AES-256 cifrado — nunca exponer en respuestas REST */
    @Column(name = "clave_hacienda_enc")
    private String claveHaciendaEnc;

    /** Path al PKCS#12 en Supabase Storage */
    @Column(name = "cert_p12_path", length = 500)
    private String certP12Path;

    /** PIN del certificado — AES-256 cifrado */
    @Column(name = "pin_cert_enc")
    private String pinCertEnc;

    /** STAG (sandbox) o PROD — solo ADMIN_IT puede cambiar a PROD */
    @Column(name = "ambiente_hacienda", length = 4)
    private String ambienteHacienda = "STAG";

    // ── Billing Stripe (F14) ─────────────────────────────────────────────────

    @Column(name = "stripe_customer_id", length = 100)
    private String stripeCustomerId;

    // ── Plan SaaS estructurado (F10) ──────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_plan")
    private Plan plan;

    /** ACTIVO | TRIAL | VENCIDO */
    @Column(name = "estado_plan", length = 20)
    private String estadoPlan = "ACTIVO";

    @Column(name = "fecha_venc_plan")
    private LocalDate fechaVencPlan;

    @Column(name = "trial_hasta")
    private LocalDate trialHasta;

    @Column(name = "timezone", length = 50)
    private String timezone = "America/Costa_Rica";

    // ── White label branding (F18) ────────────────────────────────────────────

    @Column(name = "color_acento", length = 7)
    private String colorAcento = "#1747A8";

    @Column(name = "tagline", length = 200)
    private String tagline;

    @Column(name = "footer_texto", length = 500)
    private String footerTexto;

    @Column(name = "font_familia", length = 50)
    private String fontFamilia = "Inter";

    @Column(name = "favicon_url", length = 500)
    private String faviconUrl;

    @Column(name = "og_imagen_url", length = 500)
    private String ogImagenUrl;

    @Column(name = "dominio_custom", length = 200)
    private String dominioCustom;

    // ── LATAM Expansion (F25) ─────────────────────────────────────────────────

    @Column(name = "moneda_facturacion", length = 3)
    private String monedaFacturacion = "CRC";

    @Column(name = "tax_rate_pct", precision = 5, scale = 2)
    private java.math.BigDecimal taxRatePct = java.math.BigDecimal.valueOf(13.00);

    @Column(name = "locale_codigo", length = 10)
    private String localeCodigo = "es-CR";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreEmpresa() { return nombreEmpresa; }
    public void setNombreEmpresa(String nombreEmpresa) { this.nombreEmpresa = nombreEmpresa; }

    public String getNombreComercial() { return nombreComercial; }
    public void setNombreComercial(String nombreComercial) { this.nombreComercial = nombreComercial; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getRucCedula() { return rucCedula; }
    public void setRucCedula(String rucCedula) { this.rucCedula = rucCedula; }

    public String getCorreoEmpresa() { return correoEmpresa; }
    public void setCorreoEmpresa(String correoEmpresa) { this.correoEmpresa = correoEmpresa; }

    public String getTelefonoEmpresa() { return telefonoEmpresa; }
    public void setTelefonoEmpresa(String telefonoEmpresa) { this.telefonoEmpresa = telefonoEmpresa; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getColorPrimario() { return colorPrimario; }
    public void setColorPrimario(String colorPrimario) { this.colorPrimario = colorPrimario; }

    public String getColorSecundario() { return colorSecundario; }
    public void setColorSecundario(String colorSecundario) { this.colorSecundario = colorSecundario; }

    public String getMonedaDefecto() { return monedaDefecto; }
    public void setMonedaDefecto(String monedaDefecto) { this.monedaDefecto = monedaDefecto; }

    public String getPaisOperacion() { return paisOperacion; }
    public void setPaisOperacion(String paisOperacion) { this.paisOperacion = paisOperacion; }

    public String getPlanSaas() { return planSaas; }
    public void setPlanSaas(String planSaas) { this.planSaas = planSaas; }

    public String getEstadoEmpresa() { return estadoEmpresa; }
    public void setEstadoEmpresa(String estadoEmpresa) { this.estadoEmpresa = estadoEmpresa; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public LocalDateTime getFechaAprobacion() { return fechaAprobacion; }
    public void setFechaAprobacion(LocalDateTime fechaAprobacion) { this.fechaAprobacion = fechaAprobacion; }

    public String getNumeroWhatsapp() { return numeroWhatsapp; }
    public void setNumeroWhatsapp(String numeroWhatsapp) { this.numeroWhatsapp = numeroWhatsapp; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Boolean getVisibilidadPublica() { return visibilidadPublica; }
    public void setVisibilidadPublica(Boolean visibilidadPublica) { this.visibilidadPublica = visibilidadPublica; }

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }

    public String getCedulaJuridica() { return cedulaJuridica; }
    public void setCedulaJuridica(String v) { this.cedulaJuridica = v; }

    public String getTipoCedula() { return tipoCedula; }
    public void setTipoCedula(String v) { this.tipoCedula = v; }

    public String getActividadEconomica() { return actividadEconomica; }
    public void setActividadEconomica(String v) { this.actividadEconomica = v; }

    public String getNombreComercialFe() { return nombreComercialFe != null ? nombreComercialFe : nombreComercial; }
    public void setNombreComercialFe(String v) { this.nombreComercialFe = v; }

    public String getUsuarioHacienda() { return usuarioHacienda; }
    public void setUsuarioHacienda(String v) { this.usuarioHacienda = v; }

    public String getClaveHaciendaEnc() { return claveHaciendaEnc; }
    public void setClaveHaciendaEnc(String v) { this.claveHaciendaEnc = v; }

    public String getCertP12Path() { return certP12Path; }
    public void setCertP12Path(String v) { this.certP12Path = v; }

    public String getPinCertEnc() { return pinCertEnc; }
    public void setPinCertEnc(String v) { this.pinCertEnc = v; }

    public String getAmbienteHacienda() { return ambienteHacienda != null ? ambienteHacienda : "STAG"; }
    public void setAmbienteHacienda(String v) { this.ambienteHacienda = v; }

    public boolean isConfiguracionFiscalCompleta() {
        return cedulaJuridica != null && !cedulaJuridica.isBlank()
            && actividadEconomica != null && !actividadEconomica.isBlank()
            && usuarioHacienda != null && !usuarioHacienda.isBlank()
            && claveHaciendaEnc != null && !claveHaciendaEnc.isBlank()
            && certP12Path != null && !certP12Path.isBlank()
            && pinCertEnc != null && !pinCertEnc.isBlank();
    }

    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String v) { this.stripeCustomerId = v; }

    public Plan getPlan() { return plan; }
    public void setPlan(Plan plan) { this.plan = plan; }

    public String getEstadoPlan() { return estadoPlan; }
    public void setEstadoPlan(String estadoPlan) { this.estadoPlan = estadoPlan; }

    public LocalDate getFechaVencPlan() { return fechaVencPlan; }
    public void setFechaVencPlan(LocalDate fechaVencPlan) { this.fechaVencPlan = fechaVencPlan; }

    public LocalDate getTrialHasta() { return trialHasta; }
    public void setTrialHasta(LocalDate trialHasta) { this.trialHasta = trialHasta; }

    public String getTimezone() { return timezone != null ? timezone : "America/Costa_Rica"; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public String getColorAcento() { return colorAcento != null ? colorAcento : "#1747A8"; }
    public void setColorAcento(String v) { this.colorAcento = v; }

    public String getTagline() { return tagline; }
    public void setTagline(String v) { this.tagline = v; }

    public String getFooterTexto() { return footerTexto; }
    public void setFooterTexto(String v) { this.footerTexto = v; }

    public String getFontFamilia() { return fontFamilia != null ? fontFamilia : "Inter"; }
    public void setFontFamilia(String v) { this.fontFamilia = v; }

    public String getFaviconUrl() { return faviconUrl; }
    public void setFaviconUrl(String v) { this.faviconUrl = v; }

    public String getOgImagenUrl() { return ogImagenUrl; }
    public void setOgImagenUrl(String v) { this.ogImagenUrl = v; }

    public String getDominioCustom() { return dominioCustom; }
    public void setDominioCustom(String v) { this.dominioCustom = v; }

    public String getMonedaFacturacion() { return monedaFacturacion != null ? monedaFacturacion : "CRC"; }
    public void setMonedaFacturacion(String v) { this.monedaFacturacion = v; }

    public java.math.BigDecimal getTaxRatePct() { return taxRatePct; }
    public void setTaxRatePct(java.math.BigDecimal v) { this.taxRatePct = v; }

    public String getLocaleCodigo() { return localeCodigo != null ? localeCodigo : "es-CR"; }
    public void setLocaleCodigo(String v) { this.localeCodigo = v; }

    /** Días de trial restantes. -1 si no está en trial. */
    public long getTrialDiasRestantes() {
        if (trialHasta == null) return -1;
        long dias = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), trialHasta);
        return Math.max(0, dias);
    }
}
