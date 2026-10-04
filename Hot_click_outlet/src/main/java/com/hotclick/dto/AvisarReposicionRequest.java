package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AvisarReposicionRequest {

    @NotBlank
    @Email
    @Size(max = 160)
    private String correo;

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
}
