package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres")
    private String nombre;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Correo inválido")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, max = 128, message = "La contraseña debe tener entre 8 y 128 caracteres")
    private String contrasena;

    @Pattern(regexp = "^[0-9+\\-\\s()]{7,20}$", message = "Teléfono inválido")
    private String telefono;

    public String getNombre()    { return nombre; }
    public void setNombre(String v)    { this.nombre = v; }
    public String getCorreo()    { return correo; }
    public void setCorreo(String v)    { this.correo = v; }
    public String getContrasena() { return contrasena; }
    public void setContrasena(String v) { this.contrasena = v; }
    public String getTelefono()  { return telefono; }
    public void setTelefono(String v)  { this.telefono = v; }
}
