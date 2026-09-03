package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RecoleccionCreateRequest {

    @NotBlank(message = "La zona es requerida")
    @Pattern(regexp = "^GAM$", message = "Por ahora solo recolectamos y entregamos en la GAM. Fuera de la GAM está en desarrollo.")
    private String zona;

    @NotBlank(message = "La dirección de recolección es requerida")
    @Size(max = 500)
    private String direccionRecoleccion;

    @NotBlank(message = "El contacto de recolección es requerido")
    @Size(max = 120)
    private String contactoRecoleccion;

    @NotBlank(message = "El teléfono de recolección es requerido")
    @Size(max = 30)
    private String telefonoRecoleccion;

    @NotBlank(message = "La dirección de entrega es requerida")
    @Size(max = 500)
    private String direccionEntrega;

    @NotBlank(message = "El contacto de entrega es requerido")
    @Size(max = 120)
    private String contactoEntrega;

    @NotBlank(message = "El teléfono de entrega es requerido")
    @Size(max = 30)
    private String telefonoEntrega;

    @Size(max = 2000)
    private String notas;

    public String getZona() { return zona; }
    public void setZona(String zona) { this.zona = zona; }

    public String getDireccionRecoleccion() { return direccionRecoleccion; }
    public void setDireccionRecoleccion(String direccionRecoleccion) {
        this.direccionRecoleccion = direccionRecoleccion;
    }

    public String getContactoRecoleccion() { return contactoRecoleccion; }
    public void setContactoRecoleccion(String contactoRecoleccion) {
        this.contactoRecoleccion = contactoRecoleccion;
    }

    public String getTelefonoRecoleccion() { return telefonoRecoleccion; }
    public void setTelefonoRecoleccion(String telefonoRecoleccion) {
        this.telefonoRecoleccion = telefonoRecoleccion;
    }

    public String getDireccionEntrega() { return direccionEntrega; }
    public void setDireccionEntrega(String direccionEntrega) {
        this.direccionEntrega = direccionEntrega;
    }

    public String getContactoEntrega() { return contactoEntrega; }
    public void setContactoEntrega(String contactoEntrega) {
        this.contactoEntrega = contactoEntrega;
    }

    public String getTelefonoEntrega() { return telefonoEntrega; }
    public void setTelefonoEntrega(String telefonoEntrega) {
        this.telefonoEntrega = telefonoEntrega;
    }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
