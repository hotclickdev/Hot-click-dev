package com.hotclick.agente.motor;

/**
 * Señal que el motor devuelve al canal junto con el texto: el canal decide qué hacer con ella
 * (derivar la conversación a una persona, adjuntar el enlace de compra, etc.).
 *
 * @param tipo tipo de señal
 * @param dato dato asociado (motivo de la derivación, URL del enlace…); puede traer datos del cliente: no loguear
 */
public record AccionAgente(Tipo tipo, String dato) {

    public enum Tipo { PASAR_A_PERSONA, ENLACE_CREADO, LEAD_REGISTRADO }

    public static AccionAgente pasarAPersona(String motivo) {
        return new AccionAgente(Tipo.PASAR_A_PERSONA, motivo);
    }
}
