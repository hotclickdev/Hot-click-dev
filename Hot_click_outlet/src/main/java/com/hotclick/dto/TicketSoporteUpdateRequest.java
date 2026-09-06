package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * PUT admin: accion ASIGNAR | RESOLVER.
 */
public class TicketSoporteUpdateRequest {

    @NotBlank
    @Size(max = 20)
    private String accion;

    @Size(max = 2000)
    private String notasAdmin;

    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }

    public String getNotasAdmin() { return notasAdmin; }
    public void setNotasAdmin(String notasAdmin) { this.notasAdmin = notasAdmin; }
}
