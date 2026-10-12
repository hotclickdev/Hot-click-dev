package com.hotclick.exception;

/**
 * La cuenta no tiene un negocio asociado (registro de empresa incompleto). Siempre 403 con
 * {@code data.codigo = "EMPRESA_REQUERIDA"} para que el front muestre "Completá los datos de tu negocio".
 * Nunca se cae a un listado global.
 */
public class EmpresaRequeridaException extends TenantAccessDeniedException {

    public static final String CODIGO = "EMPRESA_REQUERIDA";
    public static final String MENSAJE = "Tu cuenta no tiene un negocio asociado. Completá los datos de tu negocio.";

    public EmpresaRequeridaException() {
        super(MENSAJE);
    }
}
