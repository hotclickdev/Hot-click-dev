package com.hotclick.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class EncargoAprobarRequest {

    @NotNull(message = "El precio cotizado es requerido")
    @Min(value = 1, message = "El precio debe ser mayor a 0")
    private Integer precioCotizado;

    @Size(max = 500)
    private String mensajeArtista;

    public Integer getPrecioCotizado() { return precioCotizado; }
    public void setPrecioCotizado(Integer precioCotizado) { this.precioCotizado = precioCotizado; }

    public String getMensajeArtista() { return mensajeArtista; }
    public void setMensajeArtista(String mensajeArtista) { this.mensajeArtista = mensajeArtista; }
}
