package com.hotclick.agente.motor;

/**
 * Señal que el motor devuelve al canal junto con el texto: el canal decide qué hacer con ella
 * (derivar la conversación a una persona, adjuntar el enlace de compra, etc.).
 *
 * @param tipo tipo de señal
 * @param dato dato asociado (motivo de la derivación, URL del enlace…); puede traer datos del cliente: no loguear
 */
public record AccionAgente(Tipo tipo, String dato) {

    public enum Tipo {
        PASAR_A_PERSONA, ENLACE_CREADO, LEAD_REGISTRADO,
        /** Asesor web: agregar al carrito del navegador. {@code dato} = JSON {@code {"productoId":n,"cantidad":n}}. */
        AGREGAR_CARRITO,
        /** Asesor web: botón al chat (WhatsApp) de la tienda. {@code dato} = URL wa.me ya validada por el backend. */
        CHAT_TIENDA,
        /** Tarjetas nativas de producto (AG-37). {@code dato} = ids de producto separados por coma, ya validados como visibles. */
        MOSTRAR_PRODUCTOS
    }

    /** Sin {@code dato}: puede traer la URL de compra o datos del cliente (AG-14 H-07). */
    @Override
    public String toString() {
        return "AccionAgente[tipo=" + tipo + "]";
    }

    public static AccionAgente pasarAPersona(String motivo) {
        return new AccionAgente(Tipo.PASAR_A_PERSONA, motivo);
    }
}
