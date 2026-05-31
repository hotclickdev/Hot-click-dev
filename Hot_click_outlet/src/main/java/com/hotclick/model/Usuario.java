package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_usuario_tb")
public class Usuario extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    @Column(name = "identificacion", nullable = false, unique = true, length = 20)
    private String identificacion;

    @Column(name = "nombre", nullable = false, length = 50)
    private String nombre;

    @Column(name = "apellido_paterno", nullable = false, length = 50)
    private String apellidoPaterno;

    @Column(name = "apellido_materno", length = 50)
    private String apellidoMaterno;

    @Column(name = "correo", nullable = false, unique = true, length = 100)
    private String correo;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "telefono_alterno", length = 20)
    private String telefonoAlterno;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "contrasena_hash", nullable = false, length = 255)
    private String contrasenaHash;

    @Column(name = "foto_perfil_url", length = 500)
    private String fotoPerfilUrl;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_ultimo_acceso")
    private LocalDateTime fechaUltimoAcceso;

    @Column(name = "intentos_fallidos")
    private Integer intentosFallidos = 0;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @Column(name = "two_factor_enabled")
    private Boolean twoFactorEnabled = false;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "two_factor_secret", length = 200)
    private String twoFactorSecret;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "recovery_codes", columnDefinition = "TEXT")
    private String recoveryCodes;

    /** Comma-separated active 2FA methods: "TOTP", "EMAIL_OTP", or "TOTP,EMAIL_OTP". */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "two_factor_methods", length = 50)
    private String twoFactorMethods;

    /** Last TOTP code used — stored to detect replay within the tolerance window. */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "totp_last_used_otp", length = 10)
    private String totpLastUsedOtp;

    /** Timestamp of the last TOTP code use — paired with totpLastUsedOtp. */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "totp_last_used_at")
    private java.time.LocalDateTime totpLastUsedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "hot_click_usuario_rol_tb",
        joinColumns = @JoinColumn(name = "fk_id_usuario"),
        inverseJoinColumns = @JoinColumn(name = "fk_id_rol")
    )
    private List<Rol> roles = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIdentificacion() { return identificacion; }
    public void setIdentificacion(String identificacion) { this.identificacion = identificacion; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellidoPaterno() { return apellidoPaterno; }
    public void setApellidoPaterno(String apellidoPaterno) { this.apellidoPaterno = apellidoPaterno; }

    public String getApellidoMaterno() { return apellidoMaterno; }
    public void setApellidoMaterno(String apellidoMaterno) { this.apellidoMaterno = apellidoMaterno; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getTelefonoAlterno() { return telefonoAlterno; }
    public void setTelefonoAlterno(String telefonoAlterno) { this.telefonoAlterno = telefonoAlterno; }

    public String getContrasenaHash() { return contrasenaHash; }
    public void setContrasenaHash(String contrasenaHash) { this.contrasenaHash = contrasenaHash; }

    public String getFotoPerfilUrl() { return fotoPerfilUrl; }
    public void setFotoPerfilUrl(String fotoPerfilUrl) { this.fotoPerfilUrl = fotoPerfilUrl; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public LocalDateTime getFechaUltimoAcceso() { return fechaUltimoAcceso; }
    public void setFechaUltimoAcceso(LocalDateTime fechaUltimoAcceso) { this.fechaUltimoAcceso = fechaUltimoAcceso; }

    public Integer getIntentosFallidos() { return intentosFallidos; }
    public void setIntentosFallidos(Integer intentosFallidos) { this.intentosFallidos = intentosFallidos; }

    public LocalDateTime getBloqueadoHasta() { return bloqueadoHasta; }
    public void setBloqueadoHasta(LocalDateTime bloqueadoHasta) { this.bloqueadoHasta = bloqueadoHasta; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Long getEmpresaId() { return empresa != null ? empresa.getId() : null; }

    public List<Rol> getRoles() { return roles; }
    public void setRoles(List<Rol> roles) { this.roles = roles; }

    public Boolean getTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(Boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }

    public String getRecoveryCodes() { return recoveryCodes; }
    public void setRecoveryCodes(String recoveryCodes) { this.recoveryCodes = recoveryCodes; }

    public String getTwoFactorMethods() { return twoFactorMethods; }
    public void setTwoFactorMethods(String twoFactorMethods) { this.twoFactorMethods = twoFactorMethods; }

    public String getTotpLastUsedOtp() { return totpLastUsedOtp; }
    public void setTotpLastUsedOtp(String totpLastUsedOtp) { this.totpLastUsedOtp = totpLastUsedOtp; }

    public java.time.LocalDateTime getTotpLastUsedAt() { return totpLastUsedAt; }
    public void setTotpLastUsedAt(java.time.LocalDateTime totpLastUsedAt) { this.totpLastUsedAt = totpLastUsedAt; }

    // ── 2FA method helpers ────────────────────────────────────────────────────

    public boolean hasTotpEnabled() {
        return Boolean.TRUE.equals(twoFactorEnabled)
            && twoFactorMethods != null
            && twoFactorMethods.contains(com.hotclick.utils.Constants.METODO_2FA_TOTP);
    }

    public boolean hasEmailOtpEnabled() {
        return Boolean.TRUE.equals(twoFactorEnabled)
            && twoFactorMethods != null
            && twoFactorMethods.contains(com.hotclick.utils.Constants.METODO_2FA_EMAIL_OTP);
    }

    public java.util.List<String> getActiveMethods() {
        if (!Boolean.TRUE.equals(twoFactorEnabled) || twoFactorMethods == null) return java.util.List.of();
        return java.util.Arrays.stream(twoFactorMethods.split(","))
            .map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    /** Adds a method to the set if not already present, sets twoFactorEnabled=true. */
    public void addMethod(String method) {
        if (twoFactorMethods == null || twoFactorMethods.isBlank()) {
            twoFactorMethods = method;
        } else if (!twoFactorMethods.contains(method)) {
            twoFactorMethods = twoFactorMethods + "," + method;
        }
        twoFactorEnabled = true;
    }

    /** Removes a method. If no methods remain, sets twoFactorEnabled=false. */
    public void removeMethod(String method) {
        if (twoFactorMethods == null) return;
        String updated = java.util.Arrays.stream(twoFactorMethods.split(","))
            .map(String::trim)
            .filter(m -> !m.equals(method))
            .collect(java.util.stream.Collectors.joining(","));
        twoFactorMethods = updated.isBlank() ? null : updated;
        if (twoFactorMethods == null) twoFactorEnabled = false;
    }
}
