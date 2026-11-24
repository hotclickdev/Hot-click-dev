package com.hotclick.service.whatsapp;

/**
 * Ventana de servicio de WhatsApp: Meta permite texto libre solo si el contacto escribió al
 * negocio en las últimas 24 h; fuera de esa ventana el negocio debe usar una plantilla aprobada.
 *
 * <p>Si no hay otra implementación registrada como bean, {@link WhatsAppMessageSender} usa
 * {@link #SIEMPRE_PLANTILLA} (siempre fuera de ventana: plantilla). AG-05 (tabla de conversaciones)
 * registrará la implementación real basada en el último mensaje entrante del contacto.
 */
public interface VentanaServicioWhatsApp {

    /** Implementación por defecto: nunca hay ventana abierta, así que siempre se usa plantilla. */
    VentanaServicioWhatsApp SIEMPRE_PLANTILLA = telefono -> false;

    /**
     * @param telefono número normalizado (solo dígitos, con prefijo de país)
     * @return true si el contacto escribió en las últimas 24 h y se puede enviar texto libre
     */
    boolean dentroDeVentana(String telefono);
}
