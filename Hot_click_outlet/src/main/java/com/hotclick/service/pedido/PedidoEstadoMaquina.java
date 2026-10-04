package com.hotclick.service.pedido;

import com.hotclick.utils.Constants;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Máquina de estados del pedido para los cambios manuales ({@code PUT /api/pedidos/{id}/estado},
 * Telegram/copiloto). Solo se aceptan estados conocidos y transiciones explícitas; lo demás es
 * {@link IllegalArgumentException} (400).
 *
 * <ul>
 *   <li>Sin pago confirmado ({@code PENDIENTE}, {@code PENDIENTE_COMPROBANTE},
 *       {@code PENDIENTE_APROBACION}) → {@code PAGADO} (confirmación manual con referencia, ver
 *       {@link PedidoPagoManualService}) o {@code CANCELADO}. Nada más: ni {@code CONFIRMADO}, ni
 *       preparación, ni {@code ENTREGADO} sirven para saltarse la confirmación del pago. Única
 *       excepción (en {@code PedidoService}): efectivo con retiro en tienda, {@code PENDIENTE_COMPROBANTE → ENTREGADO}, que
 *       registra el cobro ({@link PedidoPagoManualService#confirmarCobroAlRetirar}).</li>
 *   <li>{@code PAGADO}/{@code CONFIRMADO} → preparación, listo para retiro, enviado, entregado o cancelado.</li>
 *   <li>{@code PREPARANDO}/{@code EN_PREPARACION} → listo para retiro, enviado, entregado o cancelado.</li>
 *   <li>{@code LISTO_RETIRO} → entregado, enviado o cancelado.</li>
 *   <li>{@code ENVIADO} → entregado o completado. {@code ENTREGADO} → completado.</li>
 *   <li>{@code COMPLETADO} y {@code CANCELADO} son finales.</li>
 *   <li>Pedir el mismo estado en que ya está el pedido es idempotente (no es un error).</li>
 * </ul>
 *
 * Los flujos automáticos (pasarela, aprobación SINPE, POS, cancelaciones con liberación de stock)
 * no pasan por acá.
 */
public final class PedidoEstadoMaquina {

    public static final String MENSAJE_ESTADO_INVALIDO = "Estado de pedido no válido: %s";
    public static final String MENSAJE_TRANSICION_INVALIDA = "No se puede pasar un pedido de %s a %s.";
    public static final String MENSAJE_PRIMERO_PAGO =
        "No se puede pasar un pedido de %s a %s: primero hay que confirmar el pago (PAGADO).";

    private static final int LARGO_MAXIMO_EN_MENSAJE = 40;

    private static final Set<String> DESPUES_DEL_PAGO = Set.of(
        Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PREPARANDO, Constants.PEDIDO_EN_PREPARACION,
        Constants.PEDIDO_LISTO_RETIRO, Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO,
        Constants.PEDIDO_CANCELADO);

    private static final Set<String> DESDE_PREPARACION = Set.of(
        Constants.PEDIDO_PREPARANDO, Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_CANCELADO);

    private static final Set<String> DESDE_SIN_PAGO = Set.of(Constants.PEDIDO_PAGADO, Constants.PEDIDO_CANCELADO);

    static final Map<String, Set<String>> TRANSICIONES = Map.ofEntries(
        Map.entry(Constants.PEDIDO_PENDIENTE, DESDE_SIN_PAGO),
        Map.entry(Constants.PEDIDO_PENDIENTE_COMPROBANTE, DESDE_SIN_PAGO),
        Map.entry(Constants.PEDIDO_PENDIENTE_APROBACION, DESDE_SIN_PAGO),
        Map.entry(Constants.PEDIDO_PAGADO, DESPUES_DEL_PAGO),
        Map.entry(Constants.PEDIDO_CONFIRMADO, DESPUES_DEL_PAGO),
        Map.entry(Constants.PEDIDO_PREPARANDO, DESDE_PREPARACION),
        Map.entry(Constants.PEDIDO_EN_PREPARACION, DESDE_PREPARACION),
        Map.entry(Constants.PEDIDO_LISTO_RETIRO, Set.of(
            Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_ENVIADO, Constants.PEDIDO_CANCELADO)),
        Map.entry(Constants.PEDIDO_ENVIADO, Set.of(Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO)),
        Map.entry(Constants.PEDIDO_ENTREGADO, Set.of(Constants.PEDIDO_COMPLETADO)),
        Map.entry(Constants.PEDIDO_COMPLETADO, Set.of()),
        Map.entry(Constants.PEDIDO_CANCELADO, Set.of()));

    private PedidoEstadoMaquina() {}

    /** Estado actual guardado, normalizado; null o vacío cuenta como PENDIENTE (valor por defecto). */
    public static String normalizarActual(String estado) {
        return PedidoDespachoPolicy.normalizar(estado);
    }

    /** Valida y normaliza (trim + mayúsculas) el estado pedido; desconocido o vacío → 400. */
    public static String validarEstado(String estado) {
        String normalizado = estado == null ? "" : estado.trim().toUpperCase(Locale.ROOT);
        if (!TRANSICIONES.containsKey(normalizado)) {
            throw new IllegalArgumentException(String.format(MENSAJE_ESTADO_INVALIDO, recortar(normalizado)));
        }
        return normalizado;
    }

    public static boolean permitida(String actual, String nuevo) {
        if (actual.equals(nuevo)) return true;
        Set<String> destinos = TRANSICIONES.get(actual);
        return destinos != null && destinos.contains(nuevo);
    }

    /** Lanza {@link IllegalArgumentException} (400) si la transición no está permitida. */
    public static void verificarTransicion(String actual, String nuevo) {
        if (permitida(actual, nuevo)) return;
        boolean sinPago = PedidoDespachoPolicy.ESTADOS_SIN_PAGO_CONFIRMADO.contains(actual);
        String plantilla = sinPago ? MENSAJE_PRIMERO_PAGO : MENSAJE_TRANSICION_INVALIDA;
        throw new IllegalArgumentException(String.format(plantilla, recortar(actual), nuevo));
    }

    private static String recortar(String valor) {
        String limpio = valor.replaceAll("[^A-Z0-9_ ]", "");
        return limpio.length() > LARGO_MAXIMO_EN_MENSAJE ? limpio.substring(0, LARGO_MAXIMO_EN_MENSAJE) + "…" : limpio;
    }
}
