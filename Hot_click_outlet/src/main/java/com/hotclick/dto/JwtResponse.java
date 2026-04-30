package com.hotclick.dto;

public class JwtResponse {
    private String token;
    private String tipo = "Bearer";
    private Long id;
    private String correo;
    private String rol;

    public JwtResponse(String token, Long id, String correo, String rol) {
        this.token = token;
        this.id = id;
        this.correo = correo;
        this.rol = rol;
    }

    public String getToken() { return token; }
    public String getTipo() { return tipo; }
    public Long getId() { return id; }
    public String getCorreo() { return correo; }
    public String getRol() { return rol; }
}
