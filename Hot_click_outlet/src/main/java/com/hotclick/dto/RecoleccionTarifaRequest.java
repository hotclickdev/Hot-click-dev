package com.hotclick.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class RecoleccionTarifaRequest {

    @NotNull(message = "La tarifa es requerida")
    @Min(value = 1, message = "La tarifa debe ser mayor a 0")
    private Integer tarifaColones;

    @Size(max = 1000)
    private String notasAdmin;

    public Integer getTarifaColones() { return tarifaColones; }
    public void setTarifaColones(Integer tarifaColones) { this.tarifaColones = tarifaColones; }

    public String getNotasAdmin() { return notasAdmin; }
    public void setNotasAdmin(String notasAdmin) { this.notasAdmin = notasAdmin; }
}
