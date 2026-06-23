package com.hotclick.dto;

public class UpgradeEmprendedorDTO {

    private String nombreEmpresa;
    private String nombreComercial;
    private String telefonoEmpresa;
    private String correoEmpresa;

    // Hacienda CR — verificación al registrarse como convenio
    private String  cedulaJuridica;
    private Boolean inscritoHacienda;
    private String  regimenTributario;
    private String  nombreHacienda;

    public String getNombreEmpresa()             { return nombreEmpresa; }
    public void setNombreEmpresa(String v)       { this.nombreEmpresa = v; }
    public String getNombreComercial()           { return nombreComercial; }
    public void setNombreComercial(String v)     { this.nombreComercial = v; }
    public String getTelefonoEmpresa()           { return telefonoEmpresa; }
    public void setTelefonoEmpresa(String v)     { this.telefonoEmpresa = v; }
    public String getCorreoEmpresa()             { return correoEmpresa; }
    public void setCorreoEmpresa(String v)       { this.correoEmpresa = v; }

    public String getCedulaJuridica()            { return cedulaJuridica; }
    public void setCedulaJuridica(String v)      { this.cedulaJuridica = v; }
    public Boolean getInscritoHacienda()         { return inscritoHacienda; }
    public void setInscritoHacienda(Boolean v)   { this.inscritoHacienda = v; }
    public String getRegimenTributario()         { return regimenTributario; }
    public void setRegimenTributario(String v)   { this.regimenTributario = v; }
    public String getNombreHacienda()            { return nombreHacienda; }
    public void setNombreHacienda(String v)      { this.nombreHacienda = v; }
}
