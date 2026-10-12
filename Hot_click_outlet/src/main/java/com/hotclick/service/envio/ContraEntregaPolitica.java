package com.hotclick.service.envio;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Qué se cobra contra entrega en Envío Normal (decisión HOT_CLICK 12-oct-2026: configurable,
 * por defecto el pedido completo). SOLO_ENVIO = productos en línea y solo el envío al entregar.
 */
@Component
public class ContraEntregaPolitica {

    public static final String PEDIDO_COMPLETO = "PEDIDO_COMPLETO";
    public static final String SOLO_ENVIO = "SOLO_ENVIO";

    private final String modoNormal;

    public ContraEntregaPolitica(@Value("${hotclick.envio.normal.contra-entrega:PEDIDO_COMPLETO}") String modoNormal) {
        String m = modoNormal == null ? "" : modoNormal.trim().toUpperCase();
        this.modoNormal = SOLO_ENVIO.equals(m) ? SOLO_ENVIO : PEDIDO_COMPLETO;
    }

    public String modoNormal() { return modoNormal; }

    public static boolean esEnvioNormal(String metodoEnvio) {
        return metodoEnvio != null && metodoEnvio.toUpperCase().startsWith("ENVIO_NORMAL");
    }

    /** Monto que el mensajero cobra al entregar (0 si el envío no es Normal contra entrega). */
    public long montoAlEntregar(String metodoEnvio, long totalPedido, long costoEnvio) {
        if (!esEnvioNormal(metodoEnvio)) return 0;
        return SOLO_ENVIO.equals(modoNormal) ? costoEnvio : totalPedido;
    }
}
