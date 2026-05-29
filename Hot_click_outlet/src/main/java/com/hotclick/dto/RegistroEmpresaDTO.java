package com.hotclick.dto;

public class RegistroEmpresaDTO {

    // Datos de la empresa
    private String nombreEmpresa;
    private String nombreComercial;
    private String slug;
    private String correoEmpresa;
    private String telefonoEmpresa;

    // Datos del usuario EMPRENDEDOR (dueño de la empresa)
    private String nombreAdmin;
    private String correoAdmin;
    private String passwordAdmin;
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
    public String getTelefonoAdmin()   { return telefonoAdmin; }
    public void setTelefonoAdmin(String v)   { this.telefonoAdmin = v; }
}
