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

    /**
     * Se aplica al aprobar la factura. En RTS no se envía: queda aceptada internamente. En tradicional se guarda el
     * plazo legal; con el interruptor apagado no se envía nada, y encendido igual queda bloqueado mientras no exista el
     * XSD oficial de MensajeReceptor 4.4 en el repo.
     */
    public static void aplicar(com.hotclick.model.FacturaNegocio f, boolean tradicional, boolean habilitado,
                               java.time.LocalDateTime ahora) {
        if (!tradicional) {
            f.setMensajeReceptorEstado(ESTADO_ACEPTADA_INTERNA);
            f.setMensajeReceptorDetalle("HotClick está en el Régimen Simplificado: no se envía mensaje receptor.");
            return;
        }
        f.setFechaLimiteMensajeReceptor(FacturaNegocioCalculo.plazoMensajeReceptor(f.getPeriodoHasta()));
        if (!habilitado) {
            f.setMensajeReceptorEstado(ESTADO_NO_ENVIADO_INTERRUPTOR);
            f.setMensajeReceptorDetalle("El envío del mensaje receptor está apagado en la configuración fiscal.");
        } else if (!XSD_DISPONIBLE) {
            f.setMensajeReceptorEstado(ESTADO_BLOQUEADO_SIN_XSD);
            f.setMensajeReceptorDetalle("No hay XSD oficial de MensajeReceptor 4.4: el envío queda bloqueado.");
        }
        f.setMensajeReceptorFecha(ahora);
    }
}
