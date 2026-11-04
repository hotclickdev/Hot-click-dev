package com.hotclick.service.payment;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentUserCancellationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentUserCancellationService.class);

    @Autowired private PedidoRepository       pedidoRepository;
    @Autowired private PagoRepository         pagoRepository;
    @Autowired private PaymentFailureHandler paymentFailureHandler;
    @Autowired private GuestCancelTokenService guestCancelTokenService;
    @Lazy @Autowired private OnvoPaymentProvider onvoPaymentProvider;
    @Lazy @Autowired private OnvoService onvoService;
    @Lazy @Autowired(required = false)
    private com.hotclick.service.sinpe.SinpeOnvoMarketplaceService sinpeOnvoMarketplaceService;

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
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pago no encontrado", "pago del pedido=" + RecursoNoEncontradoException.enmascarar(numeroPedido)));

        // Si el webhook ya confirmó o capturó el pago, no cancelar
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue confirmado y no puede cancelarse");
        }

        expirarSesionOnvo(pago);
        cerrarIntentSinpeOnvo(pago);
        paymentFailureHandler.marcarFallido(pago, "Cancelado por el usuario");
        log.info("Pedido {} cancelado por el usuario", numeroPedido);
    }

    @Transactional
    public void cancelarAnon(String numeroPedido, String cancelToken) {
        if (!guestCancelTokenService.esValido(numeroPedido, cancelToken)) {
            throw new SecurityException("Token de cancelación inválido o ausente");
        }

        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pedido no encontrado", "pedido=" + RecursoNoEncontradoException.enmascarar(numeroPedido)));

        if (!cancelablePorComprador(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido ya fue procesado y no puede cancelarse");
        }

        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pago no encontrado", "pago del pedido=" + RecursoNoEncontradoException.enmascarar(numeroPedido)));

        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue confirmado y no puede cancelarse");
        }

        expirarSesionOnvo(pago);
        cerrarIntentSinpeOnvo(pago);
        paymentFailureHandler.marcarFallido(pago, "Cancelado por el usuario");
        log.info("Pedido {} cancelado (invitado)", numeroPedido);
    }

    /**
     * QA7-B1 ALTO: antes de cancelar un pago ONVO se expira la checkout session en ONVO
     * (POST /v1/checkout/sessions/{id}/expire, mismo camino que la limpieza por TTL). Si ONVO no confirma
     * que quedó expirada y sin cobro (ya pagada, otro estado, caída o timeout) no se cancela: fail-closed,
     * así nunca queda un pedido cancelado con un link de pago que todavía cobra. Sin llave o con el cliente
     * deshabilitado también se rechaza (409); solo el modo simulado explícito (isMockMode) deja pasar.
     */
    private void expirarSesionOnvo(Pago pago) {
        String sesion = pago.getMerchantToken();
        if (!Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor()) || sesion == null || sesion.isBlank()) {
            return;
        }
        if (onvoService.isMockMode()) {
            // Modo simulado explícito de OnvoService (perfil dev/test sin llave): no hay sesión real que expirar.
            log.info("[onvo] Modo simulado: cancelación sin expirar en ONVO, pago id={}", pago.getId());
            return;
        }
        if (!onvoService.isPagosDisponibles()) {
            // Sin llave o cliente deshabilitado no podemos confirmar que el link dejó de cobrar: fail-closed.
            log.warn("[onvo] Cliente ONVO no disponible: no se cancela pago id={} con sesión", pago.getId());
            throw new IllegalStateException(
                "No pudimos cerrar el pago en ONVO en este momento. Intentá cancelar de nuevo en unos minutos.");
        }
        boolean expirada;
        try {
            expirada = onvoPaymentProvider.expirarSesionParaCancelar(sesion);
        } catch (RuntimeException e) {
            log.warn("[onvo] No se pudo expirar la sesión al cancelar pago id={} ({})", pago.getId(),
                e.getClass().getSimpleName());
            expirada = false;
        }
        if (!expirada) {
            throw new IllegalStateException(
                "No pudimos cerrar el pago en ONVO. Si ya pagaste, el pedido se confirma en unos minutos; "
                    + "si no, intentá cancelar de nuevo.");
        }
    }

    /**
     * N-01 ALTO: el SINPE del marketplace va por un payment intent ONVO (proveedor SINPE, token ONVOPI:). Antes de
     * cancelar se cancela el intent en ONVO y se confirma por GET; si ONVO ya lo cobró o no se pudo confirmar, no
     * se cancela (409, fail-closed como #510). Solo el modo simulado explícito deja pasar sin intent real.
     */
    private void cerrarIntentSinpeOnvo(Pago pago) {
        String token = pago.getMerchantToken();
        if (!Constants.PROVEEDOR_SINPE.equalsIgnoreCase(pago.getProveedor()) || token == null
            || !token.startsWith(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.PREFIJO)) {
            return;
        }
        var cierre = sinpeOnvoMarketplaceService == null
            ? com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.NO_CONFIRMADO
            : sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago);
        switch (cierre) {
            case CANCELADO -> { }
            case SIMULADO -> log.info("[SINPE-ONVO] Modo simulado: cancelación sin intent real, pago id={}", pago.getId());
            case PAGADO -> throw new IllegalStateException(
                "Tu pago SINPE ya fue recibido: el pedido se confirma en unos minutos y no puede cancelarse.");
            case NO_CONFIRMADO -> throw new IllegalStateException(
                "No pudimos cerrar el pago SINPE en ONVO. Intentá cancelar de nuevo en unos minutos.");
        }
    }

    /**
     * QA MEDIO (panel): antes de que el admin o el negocio cancele un pedido por PUT /api/pedidos/{id}/estado, se cierra
     * en ONVO la checkout session (tarjeta/SINPE por checkout) o el intent SINPE del marketplace, con la misma lógica
     * fail-closed de la cancelación del comprador (#510 / N-01). Sin pago: no hace nada.
     * Pago ya cobrado (CAPTURADO/PAGADO): 409 sin cancelar. Cancelar no reembolsa ni marca REEMBOLSO_PENDIENTE, así
     * que dejaría un pedido CANCELADO con la plata cobrada; el reembolso va por su propio flujo.
     * Si ONVO no confirma el cierre, lanza {@link com.hotclick.exception.CancelacionPagoNoCerradaException} (409)
     * y el pedido no se cancela.
     */
    public void cerrarPagoOnvoAntesDeCancelar(Pedido pedido) {
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
        if (pago == null) return;
        if (pagoCobrado(pago.getEstadoPago())) {
            log.warn("[pago] Cancelación desde el panel rechazada: el pago id={} ya está cobrado ({})",
                pago.getId(), pago.getEstadoPago());
            throw new com.hotclick.exception.CancelacionPagoNoCerradaException(MSG_PAGO_COBRADO);
        }
        try {
            expirarSesionOnvo(pago);
            cerrarIntentSinpeOnvo(pago);
        } catch (IllegalStateException e) {
            log.warn("[onvo] Cancelación desde el panel rechazada: no se confirmó el cierre del pago id={}", pago.getId());
            throw new com.hotclick.exception.CancelacionPagoNoCerradaException(
                "No pudimos cerrar el link de pago en ONVO, así que el pedido no se canceló. "
                    + "Si el cliente ya pagó, se confirma en unos minutos; si no, intentá de nuevo.");
        }
    }

    static final String MSG_PAGO_COBRADO =
        "Este pedido ya está pagado, así que no se puede cancelar desde aquí. Si corresponde, gestioná el reembolso.";

    /** Pago con la plata ya cobrada: cancelar el pedido sin reembolso la dejaría huérfana. */
    static boolean pagoCobrado(String estadoPago) {
        return Constants.PAGO_CAPTURADO.equalsIgnoreCase(estadoPago) || "PAGADO".equalsIgnoreCase(estadoPago);
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
