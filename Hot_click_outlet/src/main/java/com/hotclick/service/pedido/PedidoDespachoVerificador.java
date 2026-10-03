package com.hotclick.service.pedido;

import com.hotclick.exception.PedidoNoDespachableException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * SEC-09: decide si un pedido se puede despachar o entregar mirando el <b>pago</b>, nunca el campo
 * {@code estadoPedido} (que antes se podía forzar con {@code PUT /estado}).
 *
 * <ul>
 *   <li>Con {@link Pago} (del pedido o de su grupo de checkout): solo si está {@code CAPTURADO}. Un pago
 *       de pasarela pendiente, fallido o cancelado no habilita nada, diga lo que diga el pedido.</li>
 *   <li>Sin {@link Pago}: solo un pedido cubierto entero por gift card (lo marca el checkout). Las
 *       confirmaciones manuales (PAGADO con referencia, efectivo al retirar, venta manual creada como
 *       pagada) dejan un {@link Pago} {@value Constants#PROVEEDOR_MANUAL} CAPTURADO, así que entran por
 *       la primera regla.</li>
 *   <li>{@code CANCELADO} nunca se despacha.</li>
 * </ul>
 */
@Component
public class PedidoDespachoVerificador {

    private final PedidoGrupoService pedidoGrupoService;

    public PedidoDespachoVerificador(PedidoGrupoService pedidoGrupoService) {
        this.pedidoGrupoService = pedidoGrupoService;
    }

    /** True si el pedido tiene un pago verificado (Pago CAPTURADO o gift card que cubre todo). */
    public boolean pagoVerificado(Pedido pedido) {
        Optional<Pago> pago = pedidoGrupoService.pagoDelGrupo(pedido);
        if (pago.isPresent()) {
            return Constants.PAGO_CAPTURADO.equals(pago.get().getEstadoPago());
        }
        return cubiertoPorGiftCard(pedido);
    }

    /** Lanza {@link PedidoNoDespachableException} (409) si el pedido está cancelado o sin pago verificado. */
    public void verificarDespachable(Pedido pedido) {
        if (Constants.PEDIDO_CANCELADO.equals(PedidoDespachoPolicy.normalizar(pedido.getEstadoPedido()))) {
            throw new PedidoNoDespachableException(PedidoDespachoPolicy.MENSAJE_CANCELADO);
        }
        if (!pagoVerificado(pedido)) {
            throw new PedidoNoDespachableException(PedidoDespachoPolicy.MENSAJE_SIN_PAGO);
        }
    }

    static boolean cubiertoPorGiftCard(Pedido pedido) {
        if (!"GIFT_CARD".equalsIgnoreCase(pedido.getMetodoPago())) return false;
        Integer gc = pedido.getGiftCardMonto();
        Integer total = pedido.getTotalPedido();
        if (pedido.getGiftCardCodigo() == null || total == null) return false;
        return total <= 0 || (gc != null && gc >= total);
    }
}
