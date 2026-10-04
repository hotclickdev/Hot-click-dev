package com.hotclick.dto;

public class AceptarInvitacionRequest {

    private String modo;
    private String nombre;
    private String apellido;
    private String correo;
    private String password;
    private String telefono;

    public String getModo() { return modo; }
    public void setModo(String modo) { this.modo = modo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
}
