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
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.time.LocalDateTime;
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
 * No repone stock: eso sigue siendo decisión del admin.
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

    private record Preparado(Long pagoId, String estadoPedidoPrevio, String estadoPagoPrevio,
                             String intentId, String refundIdExistente, String numeroPedido) {}

    private final PedidoRepository pedidoRepository;
    private final PagoRepository pagoRepository;
    private final OnvoService onvoService;
    private final TransactionTemplate tx;

    public ReembolsoOnvoService(PedidoRepository pedidoRepository, PagoRepository pagoRepository,
                                OnvoService onvoService, PlatformTransactionManager txManager) {
        this.pedidoRepository = pedidoRepository;
        this.pagoRepository = pagoRepository;
        this.onvoService = onvoService;
        this.tx = new TransactionTemplate(txManager);
    }

    public Resultado reembolsar(Long pedidoId) {
        Preparado p = tx.execute(s -> preparar(pedidoId));
        OnvoReembolso r;
        try {
            r = p.refundIdExistente() != null
                ? onvoService.obtenerReembolso(p.refundIdExistente())
                : onvoService.crearReembolso(p.intentId(), "Reembolso pedido " + p.numeroPedido());
        } catch (HttpClientErrorException e) {
            if (p.refundIdExistente() != null) {
                log.warn("[reembolso] No se pudo leer el refund {}: {}", ocultar(p.refundIdExistente()), e.getStatusCode());
                throw new ReembolsoException(502, MSG_EN_DUDA);
            }
            log.warn("[reembolso] ONVO rechazó el reembolso del pedido {}: {}", pedidoId, e.getStatusCode());
            tx.executeWithoutResult(s -> revertir(pedidoId, p));
            throw new ReembolsoException(502, MSG_RECHAZO);
        } catch (RuntimeException e) {
            log.error("[reembolso] Reembolso ONVO del pedido {} sin respuesta clara: {}", pedidoId, e.getClass().getSimpleName());
            throw new ReembolsoException(502, MSG_EN_DUDA);
        }
        Resultado res = tx.execute(s -> aplicar(pedidoId, p, r));
        if (res.status() >= 400) throw new ReembolsoException(res.status(), res.mensaje());
        return res;
    }

    private Preparado preparar(Long pedidoId) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        String estado = PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido());
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
        boolean onvo = pago != null && Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor());

        if (Constants.PEDIDO_REEMBOLSO_PENDIENTE.equals(estado)) {
            if (onvo && pago.getOnvoReembolsoId() != null) {
                return new Preparado(pago.getId(), Constants.PEDIDO_PAGADO, Constants.PAGO_CAPTURADO,
                    null, pago.getOnvoReembolsoId(), pedido.getNumeroPedido());
            }
            throw new ReembolsoException(409, MSG_EN_DUDA_PREVIO);
        }
        if (!onvo || !Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new ReembolsoException(409, MSG_SIN_PAGO_ONVO);
        }
        if (!REEMBOLSABLES.contains(estado)) {
            throw new ReembolsoException(409, String.format(MSG_ESTADO, estado));
        }
        if (CompraPaquetes.paquetesDe(pedido, pedidoRepository).size() > 1) {
            throw new ReembolsoException(409, MSG_VARIOS_PAQUETES);
        }
        String intentId = intentDe(pago.getMerchantToken());
        if (intentId == null || !onvoService.reembolsable(intentId)) {
            throw new ReembolsoException(409, MSG_SIN_INTENT);
        }

        Preparado p = new Preparado(pago.getId(), estado, pago.getEstadoPago(), intentId, null, pedido.getNumeroPedido());
        LocalDateTime ahora = LocalDateTime.now();
        pedido.setEstadoPedido(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setMontoReembolsoPendiente(pago.getMonto());
        // Lo pidió el admin: sin correo de "reembolso pendiente" del barrido.
        pago.setAvisoReembolsoAdminEn(ahora);
        pago.setAvisoReembolsoAdminEnviadoEn(ahora);
        pedidoRepository.save(pedido);
        pagoRepository.save(pago);
        return p;
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

    private Resultado aplicar(Long pedidoId, Preparado p, OnvoReembolso r) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        Pago pago = pagoRepository.findById(p.pagoId())
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        pago.setOnvoReembolsoId(r.id());
        String status = r.status() == null ? "" : r.status().toLowerCase(java.util.Locale.ROOT);
        switch (status) {
            case "succeeded" -> {
                pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
                pago.setMontoReembolsado(pago.getMonto());
                pago.setMontoReembolsoPendiente(0);
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                pedidoRepository.save(pedido);
                pagoRepository.save(pago);
                log.info("[reembolso] Pedido {} reembolsado por ONVO ({})", pedidoId, ocultar(r.id()));
                return new Resultado(200, MSG_OK, pedido.getEstadoPedido(), pago.getEstadoPago());
            }
            case "failed" -> {
                restaurar(pedido, pago, p);
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
        restaurar(pedido, pago, p);
        pedidoRepository.save(pedido);
        pagoRepository.save(pago);
    }

    /** Ids de ONVO en logs: primeros 4 y últimos 4. */
    static String ocultar(String id) {
        if (id == null) return "null";
        return id.length() <= 8 ? "****" : id.substring(0, 4) + "..." + id.substring(id.length() - 4);
    }

    private static void restaurar(Pedido pedido, Pago pago, Preparado p) {
        pedido.setEstadoPedido(p.estadoPedidoPrevio());
        pago.setEstadoPago(p.estadoPagoPrevio());
        pago.setMontoReembolsoPendiente(null);
        pago.setAvisoReembolsoAdminEn(null);
        pago.setAvisoReembolsoAdminEnviadoEn(null);
    }
}
