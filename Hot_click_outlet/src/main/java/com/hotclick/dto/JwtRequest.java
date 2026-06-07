package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class JwtRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Correo inválido")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, max = 128, message = "La contraseña debe tener entre 6 y 128 caracteres")
    private String contrasena;

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getContrasena() { return contrasena; }
    public void setContrasena(String contrasena) { this.contrasena = contrasena; }
}
