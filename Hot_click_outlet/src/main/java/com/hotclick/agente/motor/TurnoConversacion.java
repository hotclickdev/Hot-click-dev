package com.hotclick.agente.motor;

/** Un turno previo de la conversación (cliente o bot), en orden cronológico. */
public record TurnoConversacion(Rol rol, String texto) {

    public enum Rol { USUARIO, ASISTENTE }

    /** Sin el texto del turno (AG-14 H-07). */
    @Override
    public String toString() {
        return "TurnoConversacion[rol=" + rol + "]";
    }

    public static TurnoConversacion usuario(String texto) {
        return new TurnoConversacion(Rol.USUARIO, texto);
    }

    public static TurnoConversacion asistente(String texto) {
        return new TurnoConversacion(Rol.ASISTENTE, texto);
    }
}
