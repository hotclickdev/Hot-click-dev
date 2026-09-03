package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MetodoCobroCreateRequest {

    /** sinpe | iban | tarjeta (también acepta SINPE / IBAN / TARJETA). */
    @NotBlank(message = "El tipo es requerido")
    @Size(max = 20)
    private String tipo;

    @NotBlank(message = "El dato de la cuenta es requerido")
    @Size(max = 80)
    private String dato;

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getDato() { return dato; }
    public void setDato(String dato) { this.dato = dato; }
}
