package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegistroEmpresaDTO {

    /** Grupo de validación de los datos de la cuenta nueva (solo registro-empresa). */
    public interface AltaCuenta {}


    @NotBlank(message = "El nombre de empresa es obligatorio")
    @Size(min = 2, max = 150, message = "El nombre de empresa debe tener entre 2 y 150 caracteres")
    private String nombreEmpresa;

    @Size(max = 150, message = "El nombre comercial no puede superar 150 caracteres")
    private String nombreComercial;

    @Pattern(regexp = "^$|^[a-z0-9\\-]{2,80}$", message = "El slug solo puede contener letras minúsculas, números y guiones (2–80 caracteres)")
    private String slug;

    @Email(message = "Correo de empresa inválido")
    @Size(max = 150, message = "El correo de empresa no puede superar 150 caracteres")
    private String correoEmpresa;

    @Pattern(regexp = "^$|^[0-9+\\-\\s()]{7,20}$", message = "Teléfono de empresa inválido (7–20 dígitos)")
    private String telefonoEmpresa;

    @NotBlank(message = "El nombre del administrador es obligatorio", groups = AltaCuenta.class)
    @Size(min = 2, max = 100, message = "El nombre del administrador debe tener entre 2 y 100 caracteres", groups = AltaCuenta.class)
    private String nombreAdmin;

    @NotBlank(message = "El correo del administrador es obligatorio", groups = AltaCuenta.class)
    @Email(message = "Correo de administrador inválido", groups = AltaCuenta.class)
    @Size(max = 150, message = "El correo del administrador no puede superar 150 caracteres", groups = AltaCuenta.class)
    private String correoAdmin;

    // Mismo criterio que RegisterRequest.contrasena: bcrypt solo usa los primeros
    // 72 bytes, el 128 es tope de request (docs/plan-argon2id-hashing-contrasenas.md).
    // P2-01: /auth/registro-empresa valida Default + AltaCuenta; /auth/nuevo-negocio (usuario ya
    // autenticado, no manda datos de cuenta) valida solo Default.
    @NotBlank(message = "La contraseña es obligatoria", groups = AltaCuenta.class)
    @Size(min = 8, max = 128, message = "La contraseña debe tener entre 8 y 128 caracteres", groups = AltaCuenta.class)
    private String passwordAdmin;

    @Pattern(regexp = "^$|^[0-9+\\-\\s()]{7,20}$", message = "Teléfono de administrador inválido (7–20 dígitos)", groups = AltaCuenta.class)
    private String telefonoAdmin;

    public String getNombreEmpresa()   { return nombreEmpresa; }
    public void setNombreEmpresa(String v)   { this.nombreEmpresa = v; }
    public String getNombreComercial() { return nombreComercial; }
    public void setNombreComercial(String v) { this.nombreComercial = v; }
    public String getSlug()            { return slug; }
    public void setSlug(String v)      { this.slug = v; }
    public String getCorreoEmpresa()   { return correoEmpresa; }
    public void setCorreoEmpresa(String v)   { this.correoEmpresa = v; }
    public String getTelefonoEmpresa() { return telefonoEmpresa; }
    public void setTelefonoEmpresa(String v) { this.telefonoEmpresa = telefonoOpcional(v); }
    public String getNombreAdmin()     { return nombreAdmin; }
    public void setNombreAdmin(String v)     { this.nombreAdmin = v; }
    public String getCorreoAdmin()     { return correoAdmin; }
    public void setCorreoAdmin(String v)     { this.correoAdmin = v; }
    public String getPasswordAdmin()   { return passwordAdmin; }
    public void setPasswordAdmin(String v)   { this.passwordAdmin = v; }
    public String getTelefonoAdmin()          { return telefonoAdmin; }
    public void setTelefonoAdmin(String v)         { this.telefonoAdmin = telefonoOpcional(v); }

    private String turnstileToken;
    public String getTurnstileToken() { return turnstileToken; }
    public void setTurnstileToken(String v) { this.turnstileToken = v; }

    private Boolean declaraMayoriaEdad;
    public Boolean getDeclaraMayoriaEdad() { return declaraMayoriaEdad; }
    public void setDeclaraMayoriaEdad(Boolean v) { this.declaraMayoriaEdad = v; }

    // Ubicación de despacho (opcional): si viene, se crea la primera bodega del negocio.
    // Mismos topes que la entidad Bodega; BodegaDespachoInicialService los hace cumplir.
    @Size(max = 50, message = "La provincia no puede superar 50 caracteres")
    private String provincia;

    @Size(max = 100, message = "El cantón no puede superar 100 caracteres")
    private String canton;

    @Size(max = 100, message = "El distrito no puede superar 100 caracteres")
    private String distrito;

    @Size(max = 255, message = "La dirección exacta no puede superar 255 caracteres")
    private String direccionExacta;

    private Boolean permiteRetiroCliente;

    public String getProvincia()                   { return provincia; }
    public void setProvincia(String v)             { this.provincia = v; }
    public String getCanton()                      { return canton; }
    public void setCanton(String v)                { this.canton = v; }
    public String getDistrito()                    { return distrito; }
    public void setDistrito(String v)              { this.distrito = v; }
    public String getDireccionExacta()             { return direccionExacta; }
    public void setDireccionExacta(String v)       { this.direccionExacta = v; }
    public Boolean getPermiteRetiroCliente()       { return permiteRetiroCliente; }
    public void setPermiteRetiroCliente(Boolean v) { this.permiteRetiroCliente = v; }

    public UbicacionDespachoAlta ubicacionDespacho() {
        return new UbicacionDespachoAlta(provincia, canton, direccionExacta, permiteRetiroCliente, distrito);
    }

    /**
     * BUG-S1-07: el teléfono es opcional. Vacío, solo espacios o solo el código de país
     * («+506», «+506 ») cuentan como «sin teléfono» y no como número inválido.
     */
    static String telefonoOpcional(String v) {
        if (v == null) return null;
        String t = v.trim();
        String compacto = t.replaceAll("\\s", "");
        if (compacto.replaceAll("\\D", "").isEmpty() || compacto.matches("^\\+?\\d{1,3}$")) return null;
        return t;
    }
}
