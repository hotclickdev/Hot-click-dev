package com.hotclick.agente.conexion;

/** La app de Meta todavía no está creada o configurada por el dueño de HotClick (responde 503). */
public class ConexionNoConfiguradaException extends RuntimeException {
    public static final String MENSAJE =
        "La conexión con Meta todavía no está configurada. Pendiente de configurar por HotClick.";

    public ConexionNoConfiguradaException() {
        super(MENSAJE);
    }
}
