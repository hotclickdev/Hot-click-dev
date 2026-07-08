package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegistroEmpresaDTO {

    @NotBlank(message = "El nombre de empresa es obligatorio")
    @Size(min = 2, max = 150, message = "El nombre de empresa debe tener entre 2 y 150 caracteres")
    private String nombreEmpresa;

    @Size(max = 150, message = "El nombre comercial no puede superar 150 caracteres")
    private String nombreComercial;

    @Pattern(regexp = "^[a-z0-9\\-]{2,80}$", message = "El slug solo puede contener letras minúsculas, números y guiones (2–80 caracteres)")
    private String slug;

    @Email(message = "Correo de empresa inválido")
    @Size(max = 150, message = "El correo de empresa no puede superar 150 caracteres")
    private String correoEmpresa;

    @Pattern(regexp = "^[0-9+\\-\\s()]{7,20}$", message = "Teléfono de empresa inválido (7–20 dígitos)")
    private String telefonoEmpresa;

    @NotBlank(message = "El nombre del administrador es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre del administrador debe tener entre 2 y 100 caracteres")
    private String nombreAdmin;

    @NotBlank(message = "El correo del administrador es obligatorio")
    @Email(message = "Correo de administrador inválido")
    @Size(max = 150, message = "El correo del administrador no puede superar 150 caracteres")
    private String correoAdmin;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, max = 128, message = "La contraseña debe tener entre 8 y 128 caracteres")
    private String passwordAdmin;

    @Pattern(regexp = "^[0-9+\\-\\s()]{7,20}$", message = "Teléfono de administrador inválido (7–20 dígitos)")
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
    public void setTelefonoEmpresa(String v) { this.telefonoEmpresa = v; }
    public String getNombreAdmin()     { return nombreAdmin; }
    public void setNombreAdmin(String v)     { this.nombreAdmin = v; }
    public String getCorreoAdmin()     { return correoAdmin; }
    public void setCorreoAdmin(String v)     { this.correoAdmin = v; }
    public String getPasswordAdmin()   { return passwordAdmin; }
    public void setPasswordAdmin(String v)   { this.passwordAdmin = v; }
    public String getTelefonoAdmin()          { return telefonoAdmin; }
    public void setTelefonoAdmin(String v)         { this.telefonoAdmin = v; }

    private String turnstileToken;
    public String getTurnstileToken() { return turnstileToken; }
    public void setTurnstileToken(String v) { this.turnstileToken = v; }
}
