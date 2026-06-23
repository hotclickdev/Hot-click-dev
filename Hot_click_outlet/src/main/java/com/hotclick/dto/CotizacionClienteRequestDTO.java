package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CotizacionClienteRequestDTO {

    @NotBlank(message = "El nombre comercial es obligatorio")
    @Size(max = 200)
    private String nombreComercial;

    @Size(max = 200)
    private String razonSocial;

    @Size(max = 20)
    private String cedulaJuridica;

    @Size(max = 150)
    private String correo;

    @Size(max = 20)
    private String telefono;

    private String direccion;

    @Size(max = 150)
    private String contactoPrincipal;

    public String getNombreComercial() { return nombreComercial; }
    public void setNombreComercial(String v) { this.nombreComercial = v; }

    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String v) { this.razonSocial = v; }

    public String getCedulaJuridica() { return cedulaJuridica; }
    public void setCedulaJuridica(String v) { this.cedulaJuridica = v; }

    public String getCorreo() { return correo; }
    public void setCorreo(String v) { this.correo = v; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String v) { this.telefono = v; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String v) { this.direccion = v; }

    public String getContactoPrincipal() { return contactoPrincipal; }
    public void setContactoPrincipal(String v) { this.contactoPrincipal = v; }
}
