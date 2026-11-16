package com.hotclick.exception;

/**
 * QA8: el negocio está PENDIENTE_APROBACION; no puede elegir ni pagar un plan hasta que HotClick lo apruebe.
 * Fail-closed: 409 EMPRESA_PENDIENTE_APROBACION, no se crea cobro ONVO ni cambia el plan.
 */
public class EmpresaPendienteAprobacionException extends RuntimeException {
    public static final String ESTADO = "PENDIENTE_APROBACION";
    public static final String CODIGO = "EMPRESA_PENDIENTE_APROBACION";
    public static final String MENSAJE = "Tu negocio está en revisión; podrás elegir plan cuando lo aprobemos.";

    /** Único estado aprobado para elegir plan o iniciar trial. */
    public static final String ESTADO_APROBADO = "ACTIVO";

    /**
     * Fail-closed (riesgos 15-nov): PENDIENTE_APROBACION, RECHAZADO, INACTIVO, BLOQUEADO, SUSPENDIDO o cualquier
     * estado desconocido/nulo no está aprobado. Idempotente: cubre PENDIENTE igual que el chequeo previo.
     */
    public static boolean noAprobada(String estadoEmpresa) {
        return !ESTADO_APROBADO.equals(estadoEmpresa);
    }

    public EmpresaPendienteAprobacionException() {
        super(MENSAJE);
    }
}
