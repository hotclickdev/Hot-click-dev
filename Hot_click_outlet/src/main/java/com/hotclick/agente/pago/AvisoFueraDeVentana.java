package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuenta;

import java.util.Map;

/**
 * Punto de extensión para avisar a un cliente que ya salió de la ventana de 24 h de WhatsApp, donde solo se
 * permiten plantillas aprobadas de Meta. La implementación con plantillas es {@link AvisoFueraDeVentanaPlantillas}; si no hay
 * bean (o el canal no es WhatsApp) el aviso queda marcado como pendiente en el enlace ({@code aviso_pendiente}).
 */
public interface AvisoFueraDeVentana {

    enum Tipo { PAGO_CONFIRMADO, PAGO_RECHAZADO, RECORDATORIO_1, RECORDATORIO_2, TRASPASO_ASESOR }

    /**
     * @param variables datos para la plantilla (pedido, total, enlace...). Sin texto libre.
     * @return true si se envió con una plantilla aprobada; false si no se pudo (queda pendiente).
     */
    boolean enviar(CanalCuenta cuenta, String destinatario, Tipo tipo, Map<String, String> variables);

    /** Sin plantillas: nunca envía. */
    AvisoFueraDeVentana NINGUNO = (cuenta, destinatario, tipo, variables) -> false;
}
