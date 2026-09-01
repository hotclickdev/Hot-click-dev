package com.hotclick.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class EncargoFulfillmentRequest {

    @Pattern(regexp = "^(EN_PRODUCCION|LISTO|ENTREGADO)$", message = "Estado de fulfillment inválido")
    private String estadoFulfillment;

    @Size(max = 500)
    private String detalle;

    public String getEstadoFulfillment() { return estadoFulfillment; }
    public void setEstadoFulfillment(String estadoFulfillment) { this.estadoFulfillment = estadoFulfillment; }

    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
}
