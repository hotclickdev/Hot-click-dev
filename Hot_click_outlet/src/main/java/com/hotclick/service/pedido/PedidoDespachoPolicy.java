package com.hotclick.service.pedido;

import com.hotclick.exception.PedidoNoDespachableException;
import com.hotclick.model.Pedido;
import com.hotclick.utils.Constants;

import java.util.Locale;
import java.util.Set;

/**
 * Regla única de despacho: un pedido pasa a ENVIADO (guía de Correos, envío o cambio de estado)
 * solo si su pago está confirmado.
 *
 * <ul>
 *   <li>Sin pago confirmado: {@code PENDIENTE} (tarjeta sin capturar, pedido de tienda o manual sin
 *       confirmar), {@code PENDIENTE_COMPROBANTE} (SINPE sin comprobante y EFECTIVO del checkout) y
 *       {@code PENDIENTE_APROBACION} (comprobante en revisión). El pago se confirma con
 *       {@code PAGADO} (pasarela, aprobación SINPE o confirmación manual).</li>
 *   <li>{@code CANCELADO}: nunca se despacha.</li>
 *   <li>El resto ({@code PAGADO}, {@code EN_PREPARACION}, {@code LISTO_RETIRO}, {@code ENVIADO} para
 *       corregir la guía…) no cambia. Tampoco se toca {@code ENTREGADO}: el retiro en tienda con pago
 *       en efectivo y el POS (que nace ENTREGADO) siguen igual.</li>
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

    public static boolean pagoConfirmado(String estadoPedido) {
        String estado = normalizar(estadoPedido);
        return !ESTADOS_SIN_PAGO_CONFIRMADO.contains(estado) && !Constants.PEDIDO_CANCELADO.equals(estado);
    }

    public static boolean esEnviado(String estado) {
        return estado != null && Constants.PEDIDO_ENVIADO.equals(estado.trim().toUpperCase(Locale.ROOT));
    }

    /** Lanza {@link PedidoNoDespachableException} (409) si el pedido no se puede despachar. */
    public static void verificarDespachable(Pedido pedido) {
        String estado = normalizar(pedido.getEstadoPedido());
        if (Constants.PEDIDO_CANCELADO.equals(estado)) {
            throw new PedidoNoDespachableException(MENSAJE_CANCELADO);
        }
        if (ESTADOS_SIN_PAGO_CONFIRMADO.contains(estado)) {
            throw new PedidoNoDespachableException(MENSAJE_SIN_PAGO);
        }
    }
}
