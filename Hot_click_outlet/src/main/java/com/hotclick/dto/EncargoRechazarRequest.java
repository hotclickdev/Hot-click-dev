package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class EncargoRechazarRequest {

    @NotBlank(message = "El motivo de rechazo es requerido")
    @Size(max = 1000)
    private String motivoRechazo;

    public String getMotivoRechazo() { return motivoRechazo; }
    public void setMotivoRechazo(String motivoRechazo) { this.motivoRechazo = motivoRechazo; }
}
