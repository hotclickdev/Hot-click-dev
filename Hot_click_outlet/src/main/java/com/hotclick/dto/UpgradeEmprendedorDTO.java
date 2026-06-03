package com.hotclick.dto;

public class UpgradeEmprendedorDTO {

    private String nombreEmpresa;
    private String nombreComercial;
    private String telefonoEmpresa;
    private String correoEmpresa;

    public String getNombreEmpresa()             { return nombreEmpresa; }
    public void setNombreEmpresa(String v)       { this.nombreEmpresa = v; }
    public String getNombreComercial()           { return nombreComercial; }
    public void setNombreComercial(String v)     { this.nombreComercial = v; }
    public String getTelefonoEmpresa()           { return telefonoEmpresa; }
    public void setTelefonoEmpresa(String v)     { this.telefonoEmpresa = v; }
    public String getCorreoEmpresa()             { return correoEmpresa; }
    public void setCorreoEmpresa(String v)       { this.correoEmpresa = v; }
}
