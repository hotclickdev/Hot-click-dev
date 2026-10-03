package com.hotclick.service.pedido;

import com.hotclick.utils.Constants;

import java.util.Locale;
import java.util.Set;

/**
 * Constantes y normalización compartidas por el despacho de pedidos.
 *
 * <ul>
 *   <li>Estados sin pago confirmado: {@code PENDIENTE}, {@code PENDIENTE_COMPROBANTE},
 *       {@code PENDIENTE_APROBACION}. Los usa {@link PedidoEstadoMaquina} para no dejar saltar desde
 *       ahí a preparación, despacho o entrega.</li>
 *   <li>Desde SEC-09 la decisión de despachar o entregar <b>no</b> mira el estado del pedido: la toma
 *       {@link PedidoDespachoVerificador} con el Pago (CAPTURADO) o la marca de pago manual.</li>
 *   <li>El POS (nace ENTREGADO) no pasa por acá. El cambio manual {@code sin pago → ENTREGADO} solo
 *       existe para efectivo con retiro en tienda desde PENDIENTE_COMPROBANTE (registra el cobro).</li>
 * </ul>
 */
public final class PedidoDespachoPolicy {

    public static final Set<String> ESTADOS_SIN_PAGO_CONFIRMADO = Set.of(
        Constants.PEDIDO_PENDIENTE,
        Constants.PEDIDO_PENDIENTE_COMPROBANTE,
        Constants.PEDIDO_PENDIENTE_APROBACION);

    public static final String MENSAJE_SIN_PAGO =
        "El pago de este pedido todavía no está confirmado. Podés despacharlo cuando se confirme el pago.";
    public static final String MENSAJE_CANCELADO = "Este pedido está cancelado y no se puede despachar.";

    private PedidoDespachoPolicy() {}

    /** Estado normalizado; null o vacío cuenta como PENDIENTE (valor por defecto de la entidad). */
    static String normalizar(String estado) {
        if (estado == null || estado.isBlank()) return Constants.PEDIDO_PENDIENTE;
        return estado.trim().toUpperCase(Locale.ROOT);
    }
}
