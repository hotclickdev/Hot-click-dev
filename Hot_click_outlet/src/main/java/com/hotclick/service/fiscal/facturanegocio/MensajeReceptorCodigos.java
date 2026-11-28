package com.hotclick.service.fiscal.facturanegocio;

/**
 * Mensaje receptor (aceptación de la factura que recibe HotClick). Solo aplica en régimen tradicional.
 * Los códigos son los de la versión 4.3; VERIFICAR EN 4.4 antes de encender el envío.
 * El repo no tiene el XSD oficial de MensajeReceptor 4.4: sin él, el envío queda bloqueado (no se inventa uno).
 */
public final class MensajeReceptorCodigos {

    /** Verificar en 4.4. */
    public static final String ACEPTADO = "1";
    /** Verificar en 4.4. */
    public static final String ACEPTADO_PARCIAL = "2";
    /** Verificar en 4.4. */
    public static final String RECHAZADO = "3";

    /** Hay XSD oficial de MensajeReceptor 4.4 en el classpath. Hoy no: el envío queda bloqueado. */
    public static final boolean XSD_DISPONIBLE = false;

    // Estados internos del mensaje receptor (columna mensaje_receptor_estado).
    public static final String ESTADO_ACEPTADA_INTERNA = "ACEPTADA_INTERNA";
    public static final String ESTADO_NO_ENVIADO_INTERRUPTOR = "NO_ENVIADO_INTERRUPTOR";
    public static final String ESTADO_BLOQUEADO_SIN_XSD = "BLOQUEADO_SIN_XSD";

    private MensajeReceptorCodigos() {}
}
