package com.hotclick.dto;

/**
 * Snapshot interno de un cambio de cobro. El destino nuevo NO se serializa en listados.
 */
public class MetodoCobroCambioSnapshot {

    private String tipo;
    private String destinoNuevo;
    private String mascaraNueva;
    private String mascaraActual;

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getDestinoNuevo() { return destinoNuevo; }
    public void setDestinoNuevo(String destinoNuevo) { this.destinoNuevo = destinoNuevo; }

    public String getMascaraNueva() { return mascaraNueva; }
    public void setMascaraNueva(String mascaraNueva) { this.mascaraNueva = mascaraNueva; }

    public String getMascaraActual() { return mascaraActual; }
    public void setMascaraActual(String mascaraActual) { this.mascaraActual = mascaraActual; }
}
