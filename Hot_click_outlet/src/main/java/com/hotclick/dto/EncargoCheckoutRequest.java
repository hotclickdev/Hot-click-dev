package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class EncargoCheckoutRequest {

    @NotBlank(message = "El método de envío es requerido")
    private String metodoEnvio;

    /** Proveedor de pago elegido por el cliente. Sin valor el checkout se rechaza (no hay pasarela por defecto). */
    private String provider;

    @Size(max = 500)
    private String notas;

    public String getMetodoEnvio() { return metodoEnvio; }
    public void setMetodoEnvio(String metodoEnvio) { this.metodoEnvio = metodoEnvio; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
