package com.hotclick.exception;

/** BAJO #447: la config de envío no se pudo leer; no se cobra un monto supuesto (503 genérico, fail-closed). */
public class EnvioNoDisponibleException extends RuntimeException {
    public static final String MENSAJE = "No pudimos calcular el envío en este momento. Intentá de nuevo en unos minutos.";
    public EnvioNoDisponibleException() { super(MENSAJE); }
}
