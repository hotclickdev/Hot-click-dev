package com.hotclick.dto;

import java.time.LocalDateTime;

/** Fila de moderación: solo máscaras, nunca el número completo. */
public class MetodoCobroCambioPendienteDto {

    private Long id;
    private String empresaNombre;
    private String usuarioPide;
    private String tipo;
    private String mascaraActual;
    private String mascaraNueva;
    private LocalDateTime fechaSolicitud;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmpresaNombre() { return empresaNombre; }
    public void setEmpresaNombre(String empresaNombre) { this.empresaNombre = empresaNombre; }

    public String getUsuarioPide() { return usuarioPide; }
    public void setUsuarioPide(String usuarioPide) { this.usuarioPide = usuarioPide; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getMascaraActual() { return mascaraActual; }
    public void setMascaraActual(String mascaraActual) { this.mascaraActual = mascaraActual; }

    public String getMascaraNueva() { return mascaraNueva; }
    public void setMascaraNueva(String mascaraNueva) { this.mascaraNueva = mascaraNueva; }

    public LocalDateTime getFechaSolicitud() { return fechaSolicitud; }
    public void setFechaSolicitud(LocalDateTime fechaSolicitud) { this.fechaSolicitud = fechaSolicitud; }
}
