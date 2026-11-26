package com.hotclick.agente.bandeja;

/** La acción no se puede hacer en el estado actual (ventana de 24 h vencida, conversación cerrada, canal pausado). 409. */
public class BandejaConflictoException extends RuntimeException {
    public BandejaConflictoException(String mensaje) {
        super(mensaje);
    }
}
