package com.hotclick.service.reembolso;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.OnvoService.OnvoReembolso;
import com.hotclick.service.payment.CompraPaquetes;
import com.hotclick.service.payment.OnvoCobroVerificador;
import com.hotclick.service.pedido.PedidoEstadoMaquina;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Reembolso de un pedido pagado por ONVO, pedido por el ADMIN. Fail-closed:
 * <ol>
 *   <li>Con el pedido bloqueado (FOR UPDATE) se valida y se pasa pedido y pago a REEMBOLSO_PENDIENTE (commit).</li>
 *   <li>Se pide el reembolso total a ONVO (POST /v1/refunds), fuera de la transacción y sin reintentos.</li>
 *   <li>{@code succeeded}: pago REEMBOLSADO y pedido CANCELADO. {@code pending}: sigue REEMBOLSO_PENDIENTE con el
 *       id del refund; volver a llamar lo reconsulta. ONVO rechaza (4xx o {@code failed}): se revierte al estado
 *       anterior y el admin recibe el motivo. Error sin respuesta clara (5xx, red): queda REEMBOLSO_PENDIENTE, nunca
 *       REEMBOLSADO, y no se vuelve a pedir para no devolver dos veces.</li>
 * </ol>
 * Los pedidos sin pago ONVO cobrado (pagados por fuera de la app) no pasan por acá: se cancelan como siempre.
 * Con {@code succeeded} (en la llamada, en una reconsulta o por webhook {@code refund.*}) repone el stock una sola vez.
 * <p>Las lecturas a ONVO (sesión e intent) se hacen antes del FOR UPDATE: el intent sale del merchantToken, que
 * ONVO no cambia. Con el lock se vuelve a validar todo y se exige el mismo merchantToken; si cambió, 409 sin
 * pedir nada. El único paso que decide (pasar a REEMBOLSO_PENDIENTE) sigue bajo el lock, así que dos clics
 * simultáneos no piden dos reembolsos.
 */
@Service
public class ReembolsoOnvoService {

    private static final Logger log = LoggerFactory.getLogger(ReembolsoOnvoService.class);

    public static final String MSG_NO_EXISTE = "Pedido no encontrado.";
    public static final String MSG_SIN_PAGO_ONVO =
        "Este pedido no tiene un cobro de ONVO para devolver. Si se pagó por fuera de la app, cancelalo como siempre.";
    public static final String MSG_ESTADO = "Solo se puede reembolsar un pedido pagado que todavía no se envió (estado actual: %s).";
    public static final String MSG_VARIOS_PAQUETES =
        "La compra tiene varios paquetes con un solo cobro: el reembolso por ONVO de un paquete suelto todavía no está disponible.";
    public static final String MSG_SIN_INTENT = "No se pudo identificar el cobro en ONVO. No se hizo ningún reembolso.";
    public static final String MSG_RECHAZO =
        "ONVO rechazó el reembolso. No se devolvió nada y el pedido sigue como estaba.";
    public static final String MSG_EN_DUDA =
        "ONVO no confirmó el reembolso. El pedido quedó en REEMBOLSO_PENDIENTE (no se marcó como devuelto). "
        + "Revisá el panel de ONVO antes de reintentar.";
    public static final String MSG_CAMBIO =
        "El pedido cambió mientras se preparaba el reembolso. No se pidió nada; volvé a intentar.";
    public static final String MSG_EN_DUDA_PREVIO =
        "Hay un reembolso por ONVO sin confirmar para este pedido. Revisá el panel de ONVO; no se pidió otro.";
    public static final String MSG_OK = "Reembolso confirmado por ONVO. El pedido quedó cancelado.";
    public static final String MSG_PROCESANDO =
        "ONVO está procesando el reembolso. El pedido queda en REEMBOLSO_PENDIENTE; volvé a consultar más tarde.";

    static final Set<String> REEMBOLSABLES = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PREPARANDO,
        Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO);

    /** Error con el código HTTP que debe ver el admin. */
    public static class ReembolsoException extends RuntimeException {
        private final int status;
        public ReembolsoException(int status, String mensaje) { super(mensaje); this.status = status; }
        public int getStatus() { return status; }
    }

    public record Resultado(int status, String mensaje, String estadoPedido, String estadoPago) {}

    private record Preparado(Long pagoId, String intentId, String refundIdExistente, String numeroPedido,
                             String idempotencyKey, boolean reintento) {}

    /** reconsulta = ya hay un refund con id para releer; no hace falta el intent. */
    private record Lectura(String token, boolean reconsulta) {}

    /** Resultado del webhook refund.*: el controller lo traduce a HTTP (2xx solo si quedó procesado). */
    public enum WebhookResultado { RESUELTO, YA_RESUELTO, PENDIENTE, NO_ENCONTRADO, NO_CONSULTABLE }

    private final PedidoRepository pedidoRepository;
    private final PagoRepository pagoRepository;
    private final OnvoService onvoService;
    private final ReembolsoStockService stockService;
    private final TransactionTemplate tx;

    @Autowired
    public ReembolsoOnvoService(PedidoRepository pedidoRepository, PagoRepository pagoRepository,
                                OnvoService onvoService, ReembolsoStockService stockService,
                                PlatformTransactionManager txManager) {
        this.pedidoRepository = pedidoRepository;
        this.pagoRepository = pagoRepository;
        this.onvoService = onvoService;
        this.stockService = stockService;
        this.tx = new TransactionTemplate(txManager);
    }

    public Resultado reembolsar(Long pedidoId) {
        return reembolsar(pedidoId, "ADMIN");
    }

    public Resultado reembolsar(Long pedidoId, String operador) {
        // 1) Lectura sin lock y GET a ONVO fuera de la transacción: no se tiene el FOR UPDATE esperando la red.
        Lectura l = tx.execute(s -> leer(pedidoId));
        String intentId = l.reconsulta() ? null : intentDe(l.token());
        // 2) Con el lock se revalida todo (estado, pago, mismo token) y recién ahí se pasa a REEMBOLSO_PENDIENTE.
        Preparado p = tx.execute(s -> preparar(pedidoId, l.token(), intentId));
        OnvoReembolso r;
        try {
            r = p.refundIdExistente() != null
                ? onvoService.obtenerReembolso(p.refundIdExistente())
                : onvoService.crearReembolso(p.intentId(), "Reembolso pedido " + p.numeroPedido(), p.idempotencyKey());
        } catch (HttpClientErrorException e) {
            if (p.refundIdExistente() != null || p.reintento()) {
                log.warn("[reembolso] Reintento/lectura del refund del pedido {} sin respuesta clara: {}",
                    pedidoId, e.getStatusCode());
                throw new ReembolsoException(502, MSG_EN_DUDA);
            }
            log.warn("[reembolso] ONVO rechazó el reembolso del pedido {}: {}", pedidoId, e.getStatusCode());
            tx.executeWithoutResult(s -> revertir(pedidoId, p));
            throw new ReembolsoException(502, MSG_RECHAZO);
        } catch (RuntimeException e) {
            log.error("[reembolso] Reembolso ONVO del pedido {} sin respuesta clara: {}", pedidoId, e.getClass().getSimpleName());
            throw new ReembolsoException(502, MSG_EN_DUDA);
        }
        Resultado res = tx.execute(s -> aplicar(pedidoId, p.pagoId(), r, operador));
        if (res.status() >= 400) throw new ReembolsoException(res.status(), res.mensaje());
        return res;
    }

    /**
     * Webhook {@code refund.*}: el cuerpo no se usa; se relee el refund por GET y se resuelve el pago que tiene
     * ese id. Fail-closed: sin pago, sin respuesta de ONVO o todavía pending, no cambia nada.
     */
    public WebhookResultado resolverPorWebhook(String refundId) {
        if (refundId == null || !onvoService.reembolsable(refundId)) return WebhookResultado.NO_CONSULTABLE;
        Pago pagoLeido = pagoRepository.findByOnvoReembolsoId(refundId).orElse(null);
        if (pagoLeido == null || pagoLeido.getPedido() == null || pagoLeido.getPedido().getId() == null) return WebhookResultado.NO_ENCONTRADO;
        OnvoReembolso r = onvoService.obtenerReembolso(refundId);
        if (r == null || !refundId.equals(r.id())) return WebhookResultado.NO_CONSULTABLE;
        Long pedidoId = pagoLeido.getPedido().getId();
        return tx.execute(s -> {
            Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId).orElse(null);
            Pago pago = pagoRepository.findById(pagoLeido.getId()).orElse(null);
            if (pedido == null || pago == null || !refundId.equals(pago.getOnvoReembolsoId())) {
                return WebhookResultado.NO_ENCONTRADO;
            }
            if (!Constants.PAGO_REEMBOLSO_PENDIENTE.equals(pago.getEstadoPago())) return WebhookResultado.YA_RESUELTO;
            Resultado res = aplicar(pedido, pago, r, "webhook ONVO");
            return res.status() == 202 ? WebhookResultado.PENDIENTE : WebhookResultado.RESUELTO;
        });
    }

    private Lectura leer(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
        boolean reconsulta = pago != null && pago.getOnvoReembolsoId() != null && pendiente(pedido, pago);
        return new Lectura(pago == null ? null : pago.getMerchantToken(), reconsulta);
    }

    private Preparado preparar(Long pedidoId, String tokenLeido, String intentId) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        String estado = PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido());
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
        boolean onvo = pago != null && Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor());

        if (onvo && pendiente(pedido, pago)) {
            if (pago.getOnvoReembolsoId() != null) {
                return new Preparado(pago.getId(), null, pago.getOnvoReembolsoId(), pedido.getNumeroPedido(), null, false);
            }
            // Sin id de refund: ONVO no documenta un listado por intent, así que se reintenta el POST con la MISMA
            // Idempotency-Key persistida (V228). Sin clave guardada, mismo token e intent válido, no se pide nada.
            String key = pago.getReembolsoIdempotencyKey();
            if (key != null && tokenLeido != null && tokenLeido.equals(pago.getMerchantToken())
                    && intentId != null && onvoService.reembolsable(intentId)) {
                return new Preparado(pago.getId(), intentId, null, pedido.getNumeroPedido(), key, true);
            }
            throw new ReembolsoException(409, MSG_EN_DUDA_PREVIO);
        }
        if (Constants.PEDIDO_REEMBOLSO_PENDIENTE.equals(estado)) {
            throw new ReembolsoException(409, MSG_EN_DUDA_PREVIO);
        }
        if (!onvo || !Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new ReembolsoException(409, MSG_SIN_PAGO_ONVO);
        }
        // Cancelado con el cobro todavía capturado: se devuelve igual y el pedido sigue CANCELADO.
        boolean cancelado = Constants.PEDIDO_CANCELADO.equals(estado);
        if (!cancelado && !REEMBOLSABLES.contains(estado)) {
            throw new ReembolsoException(409, String.format(MSG_ESTADO, estado));
        }
        if (CompraPaquetes.paquetesDe(pedido, pedidoRepository).size() > 1) {
            throw new ReembolsoException(409, MSG_VARIOS_PAQUETES);
        }
        if (tokenLeido == null || !tokenLeido.equals(pago.getMerchantToken())) {
            throw new ReembolsoException(409, intentId == null && tokenLeido == null ? MSG_SIN_INTENT : MSG_CAMBIO);
        }
        if (intentId == null || !onvoService.reembolsable(intentId)) {
            throw new ReembolsoException(409, MSG_SIN_INTENT);
        }

        LocalDateTime ahora = LocalDateTime.now();
        pago.setReembolsoEstadoPedidoPrevio(estado);
        pago.setReembolsoEstadoPagoPrevio(pago.getEstadoPago());
        if (!cancelado) pedido.setEstadoPedido(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setMontoReembolsoPendiente(pago.getMonto());
        // Lo pidió el admin: sin correo de "reembolso pendiente" del barrido.
        pago.setAvisoReembolsoAdminEn(ahora);
        pago.setAvisoReembolsoAdminEnviadoEn(ahora);
        String key = idempotencyKey(pago.getId(), ahora);
        pago.setReembolsoIdempotencyKey(key);
        pedidoRepository.save(pedido);
        pagoRepository.save(pago);
        return new Preparado(pago.getId(), intentId, null, pedido.getNumeroPedido(), key, false);
    }

    /** Reembolso en curso: el pedido o el pago (si el pedido ya estaba CANCELADO) en REEMBOLSO_PENDIENTE. */
    private static boolean pendiente(Pedido pedido, Pago pago) {
        return Constants.PEDIDO_REEMBOLSO_PENDIENTE.equals(PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido()))
            || (pago != null && Constants.PAGO_REEMBOLSO_PENDIENTE.equals(pago.getEstadoPago()));
    }

    /**
     * Idempotency-Key del POST /v1/refunds: única por intento de reembolso (pago + momento en que se pasó a
     * REEMBOLSO_PENDIENTE), guardada en el pago (V228) y reusada tal cual en cada reintento de ese intento. La documentación pública de ONVO no lo menciona; si lo ignora no cambia nada.
     */
    static String idempotencyKey(Long pagoId, LocalDateTime preparadoEn) {
        return "hc-reembolso-pago-" + pagoId + "-" + preparadoEn.atZone(Constants.ZONA_CR).toInstant().toEpochMilli();
    }

    /** El merchantToken es la checkout session (su paymentIntentId) o, en SINPE marketplace, el intent mismo. */
    private String intentDe(String token) {
        if (token == null || !onvoService.reembolsable(token)) return null;
        Map<?, ?> sesion = onvoService.obtenerCheckoutSession(token);
        String desdeSesion = sesion == null ? null : OnvoCobroVerificador.paymentIntentId(sesion);
        if (desdeSesion != null && !desdeSesion.isBlank()) return desdeSesion;
        Map<?, ?> intent = onvoService.obtenerPaymentIntent(token);
        return intent != null && token.equals(String.valueOf(intent.get("id"))) ? token : null;
    }

    private Resultado aplicar(Long pedidoId, Long pagoId, OnvoReembolso r, String operador) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        Pago pago = pagoRepository.findById(pagoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        return aplicar(pedido, pago, r, operador);
    }

    private Resultado aplicar(Pedido pedido, Pago pago, OnvoReembolso r, String operador) {
        pago.setOnvoReembolsoId(r.id());
        String status = r.status() == null ? "" : r.status().toLowerCase(Locale.ROOT);
        switch (status) {
            case "succeeded" -> {
                pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
                pago.setMontoReembolsado(pago.getMonto());
                pago.setMontoReembolsoPendiente(0);
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                stockService.reponerSiCorresponde(this, pedido, operador);
                pedidoRepository.save(pedido);
                pagoRepository.save(pago);
                log.info("[reembolso] Pedido {} reembolsado por ONVO ({})", pedido.getId(), OnvoService.enmascarar(r.id()));
                return new Resultado(200, MSG_OK, pedido.getEstadoPedido(), pago.getEstadoPago());
            }
            case "failed" -> {
                if (!restaurar(pedido, pago)) {
                    pagoRepository.save(pago);
                    return new Resultado(502, MSG_EN_DUDA, pedido.getEstadoPedido(), pago.getEstadoPago());
                }
                pedidoRepository.save(pedido);
                pagoRepository.save(pago);
                // Se devuelve (no se lanza) para que la reversión sí se confirme.
                return new Resultado(502, MSG_RECHAZO, pedido.getEstadoPedido(), pago.getEstadoPago());
            }
            default -> {
                pagoRepository.save(pago);
                return new Resultado(202, MSG_PROCESANDO, pedido.getEstadoPedido(), pago.getEstadoPago());
            }
        }
    }

    private void revertir(Long pedidoId, Preparado p) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId).orElse(null);
        Pago pago = pagoRepository.findById(p.pagoId()).orElse(null);
        if (pedido == null || pago == null) return;
        if (restaurar(pedido, pago)) {
            pedidoRepository.save(pedido);
            pagoRepository.save(pago);
        }
    }

    /**
     * Vuelve a los estados guardados al preparar (V227), también si el rechazo llega en una reconsulta o por
     * webhook. Sin estados guardados no inventa uno: deja REEMBOLSO_PENDIENTE y devuelve false.
     */
    private static boolean restaurar(Pedido pedido, Pago pago) {
        String pedidoPrevio = pago.getReembolsoEstadoPedidoPrevio();
        String pagoPrevio = pago.getReembolsoEstadoPagoPrevio();
        if (pedidoPrevio == null || pagoPrevio == null) {
            log.warn("[reembolso] Pago {} sin estado previo guardado: queda REEMBOLSO_PENDIENTE", pago.getId());
            return false;
        }
        pedido.setEstadoPedido(pedidoPrevio);
        pago.setEstadoPago(pagoPrevio);
        pago.setMontoReembolsoPendiente(null);
        pago.setAvisoReembolsoAdminEn(null);
        pago.setAvisoReembolsoAdminEnviadoEn(null);
        pago.setReembolsoEstadoPedidoPrevio(null);
        pago.setReembolsoEstadoPagoPrevio(null);
        pago.setReembolsoIdempotencyKey(null);
        return true;
    }
}
