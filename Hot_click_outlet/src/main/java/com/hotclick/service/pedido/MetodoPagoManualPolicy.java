package com.hotclick.service.pedido;

import com.hotclick.exception.VentaEstadoInicialInvalidoException;
import com.hotclick.exception.VentaMetodoRequierePasarelaException;
import com.hotclick.utils.Constants;

import java.util.Locale;

/**
 * Regla compartida de los caminos de alta manual de pedidos (panel, asignación, asistente de mensajería):
 * un pedido nace cerrado o cobrado solo si el cobro es presencial (efectivo) y, en la venta del panel,
 * con retiro en tienda. Cualquier otro método nace PENDIENTE y se confirma luego por la pasarela.
 * Función pura, sin consultas ni efectos.
 */
public final class MetodoPagoManualPolicy {

    public static final String METODO_EFECTIVO = "EFECTIVO";
    /** Compra hecha fuera de la plataforma que el negocio asigna a un cliente (no registra cobro propio). */
    public static final String METODO_EXTERNO = "EXTERNO";

    public static final String MSG_METODO_REQUIERE_PASARELA =
        "Las ventas registradas en el panel solo admiten efectivo. "
        + "SINPE, tarjeta y transferencia se cobran por la pasarela de pagos.";
    public static final String MSG_ESTADO_INICIAL_INVALIDO = "Estado inicial no válido.";

    private static final int LARGO_MAXIMO_ESTADO = 30;

    private MetodoPagoManualPolicy() {}

    /**
     * Rechaza todo método distinto de EFECTIVO y devuelve el valor canónico a persistir.
     * null, vacío o blanco siguen siendo efectivo.
     */
    public static String exigirEfectivo(String metodoPago, boolean restringido) {
        if (!restringido) return metodoPago != null ? metodoPago : METODO_EFECTIVO;
        if (metodoPago == null || metodoPago.isBlank()) return METODO_EFECTIVO;
        if (!METODO_EFECTIVO.equals(normalizar(metodoPago))) {
            throw new VentaMetodoRequierePasarelaException(MSG_METODO_REQUIERE_PASARELA);
        }
        return METODO_EFECTIVO;
    }

    /** null/vacío devuelve null; desconocido o demasiado largo lanza la excepción propia. */
    public static String normalizarEstadoConocido(String estadoSolicitado) {
        if (estadoSolicitado == null || estadoSolicitado.isBlank()) return null;
        if (estadoSolicitado.length() > LARGO_MAXIMO_ESTADO) {
            throw new VentaEstadoInicialInvalidoException(MSG_ESTADO_INICIAL_INVALIDO);
        }
        try {
            return PedidoEstadoMaquina.validarEstado(estadoSolicitado);
        } catch (IllegalArgumentException e) {
            throw new VentaEstadoInicialInvalidoException(MSG_ESTADO_INICIAL_INVALIDO);
        }
    }

    /**
     * Venta del panel: solo efectivo con retiro puede nacer cerrado (COMPLETADO o ENTREGADO; sin estado,
     * COMPLETADO); todo lo demás nace PENDIENTE.
     */
    public static String estadoVentaPanel(String metodoCanonico, String metodoEnvioResuelto,
                                          String estadoSolicitado, boolean restringido) {
        if (!restringido) {
            return estadoSolicitado != null && !estadoSolicitado.isBlank()
                ? estadoSolicitado
                : Constants.PEDIDO_COMPLETADO;
        }
        String estado = normalizarEstadoConocido(estadoSolicitado);
        boolean efectivoConRetiro = METODO_EFECTIVO.equals(metodoCanonico)
            && Constants.ENVIO_RETIRO.equals(metodoEnvioResuelto);
        if (!efectivoConRetiro) return Constants.PEDIDO_PENDIENTE;
        if (estado == null) return Constants.PEDIDO_COMPLETADO;
        if (Constants.PEDIDO_COMPLETADO.equals(estado) || Constants.PEDIDO_ENTREGADO.equals(estado)
                || Constants.PEDIDO_PENDIENTE.equals(estado)) {
            return estado;
        }
        return Constants.PEDIDO_PENDIENTE;
    }

    /**
     * Pedido manual (formulario de pedidos y asignación de compras): el estado pedido solo se respeta con
     * efectivo (o con compra externa si {@code permiteExterno}); con cualquier otro método o sin método el
     * pedido nace PENDIENTE. Sin estado pedido, PENDIENTE.
     */
    public static String estadoPedidoManual(String metodoPago, String estadoSolicitado, boolean permiteExterno) {
        if (estadoSolicitado == null || estadoSolicitado.isBlank()) return Constants.PEDIDO_PENDIENTE;
        String metodo = normalizar(metodoPago);
        boolean cobroDirecto = METODO_EFECTIVO.equals(metodo)
            || (permiteExterno && METODO_EXTERNO.equals(metodo));
        return cobroDirecto ? estadoSolicitado : Constants.PEDIDO_PENDIENTE;
    }

    private static String normalizar(String metodo) {
        return metodo == null ? "" : metodo.trim().toUpperCase(Locale.ROOT);
    }
}
