package com.hotclick.agente.bandeja;

/** Meta rechazó el mensaje con un 4xx (contacto no disponible, token vencido, permiso faltante). 422, no 500. */
public class BandejaRechazoCanalException extends RuntimeException {
    private final int codigoMeta;

    public BandejaRechazoCanalException(int codigoMeta) {
        super("Meta rechazó el mensaje (código " + codigoMeta + "). Revisá que el contacto siga disponible y que el canal "
            + "esté bien conectado, o reconectalo desde Canales.");
        this.codigoMeta = codigoMeta;
    }

    public int codigoMeta() { return codigoMeta; }
}
