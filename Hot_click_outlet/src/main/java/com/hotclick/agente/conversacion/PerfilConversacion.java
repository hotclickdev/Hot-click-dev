package com.hotclick.agente.conversacion;

/** Qué bot atiende la conversación. */
public enum PerfilConversacion {
    /** Bot del negocio hablando con un cliente. */
    NEGOCIO_VENTAS,
    /** Bot del negocio hablando con el dueño o personal (teléfono vinculado). */
    NEGOCIO_INTERNO,
    /** Bot de HotClick en sus propias redes (marketplace y planes). */
    HOTCLICK,
    /** Asesor del sitio web. */
    ASESOR_WEB
}
