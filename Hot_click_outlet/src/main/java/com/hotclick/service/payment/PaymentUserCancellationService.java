package com.hotclick.service.payment;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentUserCancellationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentUserCancellationService.class);

    @Autowired private PedidoRepository       pedidoRepository;
    @Autowired private PagoRepository         pagoRepository;
    @Autowired private PaymentFailureHandler paymentFailureHandler;
    @Autowired private GuestCancelTokenService guestCancelTokenService;

    @Transactional
    public void cancelarPorUsuario(String numeroPedido, String correoUsuario) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new SecurityException("No se pudo validar el pedido"));

        String dueno = pedido.getUsuarioFinal() == null ? null : pedido.getUsuarioFinal().getCorreo();
        if (dueno == null || correoUsuario == null || !dueno.trim().equalsIgnoreCase(correoUsuario.trim())) {
            throw new SecurityException("No se pudo validar el pedido");
        }

        if (!cancelablePorComprador(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido ya fue procesado y no puede cancelarse");
        }

        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago no encontrado para pedido: " + numeroPedido));

        // Si el webhook ya confirmó o capturó el pago, no cancelar
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue confirmado y no puede cancelarse");
        }

        paymentFailureHandler.marcarFallido(pago, "Cancelado por el usuario");
        log.info("Pedido {} cancelado por el usuario", numeroPedido);
    }

    @Transactional
    public void cancelarAnon(String numeroPedido, String cancelToken) {
        if (!guestCancelTokenService.esValido(numeroPedido, cancelToken)) {
            throw new SecurityException("Token de cancelación inválido o ausente");
        }

        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + numeroPedido));

        if (!cancelablePorComprador(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido ya fue procesado y no puede cancelarse");
        }

        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago no encontrado para pedido: " + numeroPedido));

        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue confirmado y no puede cancelarse");
        }

        paymentFailureHandler.marcarFallido(pago, "Cancelado por el usuario");
        log.info("Pedido {} cancelado (invitado)", numeroPedido);
    }

    /**
     * PAG-8: el SINPE o efectivo recién creado queda en PENDIENTE_COMPROBANTE; el comprador también puede cancelarlo
     * (marcarFallido cancela el grupo y libera la reserva). Con comprobante en revisión ya decide el admin.
     */
    static boolean cancelablePorComprador(String estadoPedido) {
        return Constants.PEDIDO_PENDIENTE.equals(estadoPedido)
            || Constants.PEDIDO_PENDIENTE_COMPROBANTE.equals(estadoPedido);
    }
}
