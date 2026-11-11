package com.hotclick.payment;

import com.hotclick.service.OnvoService;
import com.hotclick.model.Pago;
import com.hotclick.model.WebhookEvent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Escribe en la base lo que ONVO ya confirmó por GET. Solo lo llama {@link OnvoPaymentProvider}
 * después de verificar la sesión y el payment intent; acá no se consulta a ONVO.
 * Transacción propia: un fallo de la captura no deja en rollback-only a quien la llama
 * (p. ej. la limpieza por expiración, que procesa varios pagos en una sola transacción).
 */
@Service
public class OnvoCapturaService {

    private static final Logger log = LoggerFactory.getLogger(OnvoCapturaService.class);

    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private PedidoGrupoService     pedidoGrupoService;
    @Autowired(required = false) private com.hotclick.service.OnvoService onvoService;
    @Autowired private com.hotclick.repository.PedidoRepository pedidoRepository;
    @Autowired(required = false) private com.hotclick.service.payment.AvisoReembolsoPendienteService avisoReembolso;
    @Autowired(required = false) private com.hotclick.service.payment.StockReservationService stockReservationService;

    /** Resultado de escribir un cobro que ONVO ya confirmó. */
    public enum Captura { CAPTURADO, DUPLICADO, COBRADO_SOBRE_CANCELADO, COBRADO_SOBREVENTA }

    @Lazy
    @Autowired private PaymentService paymentService;

    /**
     * DUPLICADO si otra entrega ya la había procesado (dedupe por sessionId).
     * COBRADO_SOBRE_CANCELADO si el pedido ya estaba cancelado (expiró o lo canceló el comprador):
     * no se resucita, porque su stock ya se liberó y podría venderse dos veces.
     * COBRADO_SOBREVENTA (M-08) si se agotó el stock entre el cobro y la confirmación.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Captura capturarVerificado(String checkoutSessionId, String resumen, String origen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(
                checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION)) {
            return Captura.DUPLICADO;
        }
        // C6: el webhook y el retorno pueden llegar juntos. La fila del pago se bloquea y, ya con el lock,
        // se vuelve a mirar si la otra entrega registró el evento (la segunda espera y sale DUPLICADO).
        Pago pago = pagoRepository.findByMerchantTokenForUpdate(checkoutSessionId).orElse(null);
        if (pago != null && webhookEventRepository.existsByMerchantTokenAndEventoTipo(
                checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION)) {
            return Captura.DUPLICADO;
        }
        if (pago == null || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())
                || Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return Captura.DUPLICADO;
        }

        WebhookEvent evento = registrar(checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION, resumen, origen);

        if (com.hotclick.service.payment.PaymentOrderConfirmationService.enReembolso(pago.getEstadoPago())) {
            // PR #460 (M1): reintento sobre un cobro ya marcado para reembolso: no se recaptura ni se re-alerta.
            evento.setProcesado(true);
            evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
            evento.setErrorProcesamiento("Pago ya en reembolso");
            webhookEventRepository.save(evento);
            log.info("[onvo] Captura ignorada: pago {} ya está en {}", pago.getId(), pago.getEstadoPago());
            return Captura.DUPLICADO;
        }

        // fix2: intención explícita durable. Si el comprador o el panel pidió cancelar (aunque ONVO estuviera en duda
        // en ese momento), el cobro no confirma la venta: el pedido se cancela, la reserva se libera una sola vez
        // (marca stockReservadoEn) y el pago queda REEMBOLSO_PENDIENTE con aviso. Se relee de la base.
        boolean cancelacionPedida = pago.getId() != null
            && pagoRepository.cancelacionSolicitadaEnBase(pago.getId()).isPresent();
        if (cancelacionPedida) {
            cancelarPedidosPendientes(pago);
        }
        if (cancelacionPedida || algunoCancelado(pago)) {
            // QA7 (pedido 21): un cobro de prueba sobre un pedido cancelado también es dato de prueba.
            marcarSiEsPrueba(pago, checkoutSessionId);
            pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
            // Marca de aviso pendiente en esta misma transacción; el envío sale después del commit.
            if (avisoReembolso != null) avisoReembolso.registrarPendiente(pago);
            pagoRepository.save(pago);
            evento.setProcesado(true);
            evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
            evento.setErrorProcesamiento("Cobro de ONVO sobre pedido cancelado: reembolso pendiente");
            webhookEventRepository.save(evento);
            log.error("[ALERTA-PAGO] ONVO cobró un pedido ya cancelado; queda para reembolso del admin: sessionId={}",
                OnvoService.enmascarar(checkoutSessionId));
            // Aviso al admin después del commit, con dedupe por pago; si falla, el pago sigue REEMBOLSO_PENDIENTE.
            return Captura.COBRADO_SOBRE_CANCELADO;
        }

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo(Constants.PROVEEDOR_ONVO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        marcarSiEsPrueba(pago, checkoutSessionId);
        boolean sobreventa = paymentService.confirmarPedido(pago)
            == com.hotclick.service.payment.PaymentOrderConfirmationService.Resultado.SOBREVENTA;

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        // M-08: con sobreventa el cobro queda registrado y el evento procesado: reintentar no cambia nada.
        if (sobreventa) {
            evento.setErrorProcesamiento("Cobro de ONVO sin stock: pedido en revisión, reembolso pendiente");
        }
        webhookEventRepository.save(evento);
        if (sobreventa) {
            log.error("[ALERTA-PAGO] ONVO cobró un pedido sin stock; en revisión, reembolso pendiente: sessionId={}",
                OnvoService.enmascarar(checkoutSessionId));
            return Captura.COBRADO_SOBREVENTA;
        }

        log.info("[onvo] Checkout confirmado: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
        return Captura.CAPTURADO;
    }

    /**
     * P-04 (C3): el verificador ya exigió que el cobro traiga el mismo mode que la llave. Con llave de prueba
     * (opt-in o dev/test) el pedido se marca como prueba. Fail-closed: sin OnvoService se marca igual.
     * No toca el opt-in.
     */
    void marcarSiEsPrueba(Pago pago, String sessionId) {
        boolean prueba = onvoService == null || !"live".equals(onvoService.modoEsperado());
        if (!prueba || pago.getPedido() == null) return;
        // SCALE1: sin save por pedido. Corre dentro de la tx REQUIRES_NEW de capturarVerificado:
        // los pedidos del grupo están gestionados y el dirty checking los persiste en el flush del commit.
        for (com.hotclick.model.Pedido p : pedidoGrupoService.delGrupo(pago.getPedido())) {
            p.setEsPrueba(true);
        }
        log.warn("[ALERTA-PAGO] Cobro ONVO en modo prueba: pedido marcado es_prueba. sessionId={}", OnvoService.enmascarar(sessionId));
    }

    /**
     * fix2 (cancelación explícita con cobro). Corre en la transacción de quien llama (MANDATORY: nunca abre otra, así
     * no hay REQUIRES_NEW bajo el lock del pedido del panel) y exige el pago ya bloqueado por quien llama
     * ({@code FOR UPDATE}). Registra el evento de la sesión (dedupe: el webhook que llegue después sale DUPLICADO),
     * cancela los pedidos pendientes del grupo con su reserva liberada una sola vez y deja el pago
     * REEMBOLSO_PENDIENTE con aviso al admin. No confirma la venta, no reembolsa solo ni escribe en ONVO.
     *
     * @return false si otra entrega ya registró la sesión (quien llama relee el estado del pago).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean registrarCobroSobreCancelacionExplicita(Pago pagoBloqueado, String origen) {
        String sesion = pagoBloqueado.getMerchantToken();
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(sesion, OnvoPaymentProvider.EVENTO_SESION)) {
            return false;
        }
        WebhookEvent evento = registrar(sesion, OnvoPaymentProvider.EVENTO_SESION,
            "{\"verificado\":\"GET ONVO\",\"cancelacionExplicita\":true}", origen);
        cancelarPedidosPendientes(pagoBloqueado);
        marcarSiEsPrueba(pagoBloqueado, sesion);
        pagoBloqueado.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pagoBloqueado.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        if (avisoReembolso != null) avisoReembolso.registrarPendiente(pagoBloqueado);
        pagoRepository.save(pagoBloqueado);
        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        evento.setErrorProcesamiento("Cobro de ONVO sobre cancelación explícita: reembolso pendiente");
        webhookEventRepository.save(evento);
        log.error("[ALERTA-PAGO] ONVO cobró un pedido que se pidió cancelar; queda para reembolso del admin: sessionId={}",
            OnvoService.enmascarar(sesion));
        return true;
    }

    /** Pedidos del grupo todavía pendientes → CANCELADO y su reserva liberada (idempotente por stockReservadoEn). */
    private void cancelarPedidosPendientes(Pago pago) {
        if (pago.getPedido() == null || stockReservationService == null) return;
        for (com.hotclick.model.Pedido p : pedidoGrupoService.delGrupo(pago.getPedido())) {
            String e = p.getEstadoPedido();
            if (Constants.PEDIDO_PENDIENTE.equals(e) || Constants.PEDIDO_PENDIENTE_COMPROBANTE.equals(e)
                    || Constants.PEDIDO_PENDIENTE_APROBACION.equals(e)) {
                p.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                stockReservationService.liberarReservas(p);
            }
        }
    }

    private boolean algunoCancelado(Pago pago) {
        if (pago.getPedido() == null) return false;
        return pedidoGrupoService.delGrupo(pago.getPedido()).stream()
            .anyMatch(pedido -> Constants.PEDIDO_CANCELADO.equals(pedido.getEstadoPedido()));
    }

    /** Guarda el SINPERefNumber una sola vez en el pago ya capturado. No toca estado ni montos. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void guardarSinpeRef(String checkoutSessionId, String sinpeRef) {
        if (sinpeRef == null || sinpeRef.isBlank()) return;
        pagoRepository.findByMerchantToken(checkoutSessionId)
            .filter(p -> p.getSinpeRefNumber() == null)
            .ifPresent(p -> {
                p.setSinpeRefNumber(sinpeRef);
                pagoRepository.save(p);
            });
    }

    /**
     * V237: recuerda el payment intent que ONVO muestra por GET en la sesión (la sesión manda: si cambió, se guarda el
     * último y queda un aviso). No toca estado ni montos. Best-effort: quien llama ignora los fallos.
     * fix2 (BAJO): UPDATE condicional sobre la columna (updatable=false en la entidad), así un save posterior de una
     * copia obsoleta del pago no lo pisa con NULL. REQUIRED (antes REQUIRES_NEW): se une a la transacción de quien
     * llama y no abre una segunda conexión que espere la fila bajo un lock externo (autobloqueo del panel).
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public boolean guardarIntentId(String checkoutSessionId, String intentId) {
        if (checkoutSessionId == null || intentId == null || intentId.isBlank()) return false;
        // fix2: la primera referencia gana y nunca se reemplaza en silencio. Un intent distinto al guardado es un
        // conflicto: false (quien llama decide EN_DUDA) y alerta; la columna queda como estaba.
        if (pagoRepository.guardarIntentId(checkoutSessionId, intentId) > 0) return true;
        String previo = pagoRepository.intentIdEnBase(checkoutSessionId).orElse(null);
        if (intentId.equals(previo)) return true;
        log.error("[ALERTA-PAGO] La sesión ONVO muestra un payment intent distinto al guardado; no se reemplaza y "
            + "queda en duda (revisión manual). sessionId={}", OnvoService.enmascarar(checkoutSessionId));
        return false;
    }

    /**
     * fix2 (dedupe persistente): marca una sola vez que la sesión dio 404 sin intent guardado. true solo la primera vez.
     * REQUIRED: se une a la transacción de quien llama o abre una corta (los barridos corren sin transacción).
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public boolean marcarSinReferencia(String checkoutSessionId) {
        if (checkoutSessionId == null) return false;
        return pagoRepository.marcarSinReferencia(checkoutSessionId, LocalDateTime.now(Constants.ZONA_CR)) > 0;
    }

    WebhookEvent registrar(String token, String tipo, String resumen, String origen) {
        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(token);
        evento.setEventoTipo(tipo);
        evento.setPayloadRaw(resumen);
        evento.setIpOrigen(origen);
        evento.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);
        return evento;
    }
}
