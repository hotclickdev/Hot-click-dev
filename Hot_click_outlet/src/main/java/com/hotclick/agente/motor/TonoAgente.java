package com.hotclick.agente.motor;

/**
 * Tono configurable del bot. Hoy se usan los valores por defecto; los textos definitivos los da el dueño.
 *
 * @param nombreBot nombre con el que el bot se presenta
 * @param trato     usted o tuteo (nunca voseo de cara al cliente)
 * @param emojis    si puede usar emojis con moderación
 */
public record TonoAgente(String nombreBot, Trato trato, boolean emojis) {

    public enum Trato { USTED, TUTEO }

    public static final TonoAgente POR_DEFECTO = new TonoAgente("el asistente virtual", Trato.USTED, false);

    public TonoAgente {
        nombreBot = nombreBot == null || nombreBot.isBlank() ? "el asistente virtual" : nombreBot.trim();
        trato = trato == null ? Trato.USTED : trato;
    }

    /** Elige entre la variante de usted y la de tuteo de un texto. */
    public String segun(String usted, String tuteo) {
        return trato == Trato.USTED ? usted : tuteo;
    }
}
