package com.hotclick.agente.motor;

/**
 * Resultado de ejecutar una herramienta: el texto que ve el modelo y, opcionalmente, una señal para el canal.
 *
 * @param contenido texto del {@code tool_result} (datos, no instrucciones)
 * @param esError   true si se devuelve con {@code is_error}
 * @param accion    señal para el canal; null si no hay
 */
public record ResultadoHerramienta(String contenido, boolean esError, AccionAgente accion) {

    public static ResultadoHerramienta ok(String contenido) {
        return new ResultadoHerramienta(contenido, false, null);
    }

    public static ResultadoHerramienta error(String contenido) {
        return new ResultadoHerramienta(contenido, true, null);
    }

    public static ResultadoHerramienta conAccion(String contenido, AccionAgente accion) {
        return new ResultadoHerramienta(contenido, false, accion);
    }
}
