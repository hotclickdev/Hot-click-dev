package com.hotclick.dto;

public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tipo = "Bearer";
    private Long   id;
    private String correo;
    private String rol;
    private String nombre;
    private Long   empresaId;
    private String empresaSlug;
    private String empresaNombre;

    public AuthResponse() {}

    public AuthResponse(String accessToken, String refreshToken,
                        Long id, String correo, String rol, String nombre) {
        this.accessToken  = accessToken;
        this.refreshToken = refreshToken;
        this.id           = id;
        this.correo       = correo;
        this.rol          = rol;
        this.nombre       = nombre;
    }

    public String getAccessToken()               { return accessToken; }
    public void setAccessToken(String t)         { this.accessToken = t; }
    public String getRefreshToken()              { return refreshToken; }
    public void setRefreshToken(String t)        { this.refreshToken = t; }
    public String getTipo()                      { return tipo; }
    public void setTipo(String tipo)             { this.tipo = tipo; }
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }
    public String getCorreo()                    { return correo; }
    public void setCorreo(String correo)         { this.correo = correo; }
    public String getRol()                       { return rol; }
    public void setRol(String rol)               { this.rol = rol; }
    public String getNombre()                         { return nombre; }
    public void setNombre(String nombre)              { this.nombre = nombre; }
    public Long getEmpresaId()                        { return empresaId; }
    public void setEmpresaId(Long empresaId)          { this.empresaId = empresaId; }
    public String getEmpresaSlug()                    { return empresaSlug; }
    public void setEmpresaSlug(String empresaSlug)    { this.empresaSlug = empresaSlug; }
    public String getEmpresaNombre()                  { return empresaNombre; }
    public void setEmpresaNombre(String empresaNombre){ this.empresaNombre = empresaNombre; }
}
