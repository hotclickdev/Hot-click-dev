package com.hotclick.agente.conexion;

/**
 * Meta respondió 4xx (código vencido, permiso faltante, token inválido). Es un error del flujo del usuario, no
 * una caída de Meta: no cuenta para el circuit breaker. El mensaje nunca trae tokens ni el cuerpo de Meta.
 */
public class MetaRechazoException extends RuntimeException {
    private final int codigoMeta;

    public MetaRechazoException(int codigoMeta) {
        super("Meta rechazó la solicitud (código " + codigoMeta + "). Volvé a intentar la conexión.");
        this.codigoMeta = codigoMeta;
    }

    public int codigoMeta() { return codigoMeta; }
}
