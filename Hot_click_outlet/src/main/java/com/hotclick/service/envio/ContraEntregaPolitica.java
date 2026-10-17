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

    /** Decisión HOT_CLICK 16-oct-2026: Envío Normal = contra entrega, configurable. */
    @Value("${hotclick.envio.normal.contra-entrega.habilitada:true}")
    private boolean habilitada = true;

    public boolean habilitada() { return habilitada; }

    /** Efectivo permitido: la bodega lo acepta, o es Envío Normal con contra entrega habilitada. */
    public static boolean permiteEfectivo(boolean bodegaAcepta, String metodoEnvio, boolean contraEntregaNormal) {
        return bodegaAcepta || (contraEntregaNormal && esEnvioNormal(metodoEnvio));
    }

    public ContraEntregaPolitica(@Value("${hotclick.envio.normal.contra-entrega:PEDIDO_COMPLETO}") String modoNormal) {
        String m = modoNormal == null ? "" : modoNormal.trim().toUpperCase();
        this.modoNormal = SOLO_ENVIO.equals(m) ? SOLO_ENVIO : PEDIDO_COMPLETO;
    }

    public String modoNormal() { return modoNormal; }

    public static boolean esEnvioNormal(String metodoEnvio) {
        if (metodoEnvio == null) return false;
        String m = metodoEnvio.toUpperCase();
        // La tienda pública manda DOMICILIO: es el Envío Normal de HotClick.
        return m.startsWith("ENVIO_NORMAL") || "DOMICILIO".equals(m);
    }

    /**
     * Contra entrega solo con Envío Normal: si el provider es CONTRA_ENTREGA, el método principal
     * y todos los paquetes deben ser ENVIO_NORMAL*. Lanza IllegalArgumentException (→ 400).
     */
    public static void validarCheckout(com.hotclick.dto.PaymentCheckoutRequest req) {
        if (req == null || req.getProvider() == null
                || !"CONTRA_ENTREGA".equalsIgnoreCase(req.getProvider().trim())) {
            return;
        }
        String msg = "Contra entrega solo está disponible con envío normal.";
        boolean hayMetodo = false;
        if (req.getMetodoEnvio() != null && !req.getMetodoEnvio().isBlank()) {
            hayMetodo = true;
            if (!esEnvioNormal(req.getMetodoEnvio())) throw new IllegalArgumentException(msg);
        }
        if (req.getEnvios() != null) {
            for (var p : req.getEnvios()) {
                hayMetodo = true;
                if (p == null || !esEnvioNormal(p.getMetodoEnvio())) throw new IllegalArgumentException(msg);
            }
        }
        if (!hayMetodo) throw new IllegalArgumentException(msg);
    }

    /** Monto que el mensajero cobra al entregar (0 si el envío no es Normal contra entrega). */
    public long montoAlEntregar(String metodoEnvio, long totalPedido, long costoEnvio) {
        if (!esEnvioNormal(metodoEnvio)) return 0;
        return SOLO_ENVIO.equals(modoNormal) ? costoEnvio : totalPedido;
    }
}
