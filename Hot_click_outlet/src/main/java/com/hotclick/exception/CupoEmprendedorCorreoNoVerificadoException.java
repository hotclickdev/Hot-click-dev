package com.hotclick.exception;

/**
 * El puesto de trial Emprendedor solo se asigna a un propietario con correo verificado. Al aprobar un negocio cuyo
 * propietario no verificó su correo, la aprobación se rechaza (409) y no se consume cupo: se reintenta cuando verifique.
 */
public class CupoEmprendedorCorreoNoVerificadoException extends RuntimeException {

    public static final String CODIGO = "CUPO_EMPRENDEDOR_CORREO_NO_VERIFICADO";
    public static final String MENSAJE =
        "El propietario debe verificar su correo antes de aprobar el negocio Emprendedor (puesto de trial).";

    public CupoEmprendedorCorreoNoVerificadoException() {
        super(MENSAJE);
    }
}
