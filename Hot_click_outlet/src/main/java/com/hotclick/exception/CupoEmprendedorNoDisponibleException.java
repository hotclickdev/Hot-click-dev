package com.hotclick.exception;

/**
 * La base de datos falló al reservar el puesto de trial Emprendedor. No es «sin cupo»: se revierte la aprobación
 * completa (no se consume puesto ni se aprueba el negocio) y se responde 409 con un código, para reintentar luego.
 * El mensaje es fijo y no incluye datos de la causa (puede traer correos).
 */
public class CupoEmprendedorNoDisponibleException extends RuntimeException {

    public static final String CODIGO = "CUPO_EMPRENDEDOR_NO_DISPONIBLE";
    public static final String MENSAJE =
        "No se pudo reservar el puesto del plan Emprendedor en este momento. La aprobación no se aplicó; reintentá en unos minutos.";

    public CupoEmprendedorNoDisponibleException() {
        super(MENSAJE);
    }
}
