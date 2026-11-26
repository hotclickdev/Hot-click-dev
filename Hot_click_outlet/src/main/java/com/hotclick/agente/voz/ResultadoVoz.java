package com.hotclick.agente.voz;

/**
 * Resultado de transcribir una nota de voz.
 *
 * @param texto    lo que dijo el cliente (contenido del cliente: nunca se registra en logs)
 * @param segundos duración del audio según el proveedor; se usa para el control de costo y el límite de duración
 */
public record ResultadoVoz(String texto, int segundos) {
    @Override
    public String toString() {
        return "ResultadoVoz[" + segundos + " s]";
    }
}
