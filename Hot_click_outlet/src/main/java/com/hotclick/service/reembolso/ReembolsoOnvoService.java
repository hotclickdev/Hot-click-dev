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
 *   <li>Se lee el payment intent. Solo si está {@code succeeded} y el monto (céntimos CRC) coincide, se pide el
 *       reembolso con {@code POST /v1/refunds} (amount + reason). Nunca se cancela un intent ya capturado.</li>
 *   <li>{@code succeeded} (o el intent ya {@code refunded} en ONVO): pago REEMBOLSADO y pedido CANCELADO.
 *       {@code pending}: sigue REEMBOLSO_PENDIENTE con el id del refund; volver a llamar lo reconsulta.
 *       ONVO rechaza el POST (4xx, incluido {@code refunds.payment_intent_already_payed}): queda REEMBOLSO_PENDIENTE
 *       con el motivo visible. Un REEMBOLSO_PENDIENTE sin id (cobrado sobre un pedido ya cancelado, sin refund en ONVO)
 *       sí puede pedir el primero, después de leer el intent: solo si sigue {@code succeeded} y sin reembolso.
 *       Si ONVO ya lo reembolsó, no se crea otro. Un intento anterior sin respuesta clara no se repite.
 *       {@code failed} de un refund ya creado vuelve al estado previo.</li>
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
    public static final String MSG_YA_REEMBOLSADO =
        "Este pedido ya fue reembolsado. No se volvió a devolver nada; revisá el detalle del pago si tenés dudas.";
    public static final String MSG_SIN_PAGO_ONVO =
        "Este pedido no tiene un cobro de ONVO para devolver. Si se pagó por fuera de la app, cancelalo como siempre.";
    public static final String MSG_ESTADO = "Solo se puede reembolsar un pedido pagado que todavía no se envió (estado actual: %s).";
    public static final String MSG_VARIOS_PAQUETES =
        "La compra tiene varios paquetes con un solo cobro: el reembolso por ONVO de un paquete suelto todavía no está disponible.";
    public static final String MSG_SIN_INTENT = "No se pudo identificar el cobro en ONVO. No se hizo ningún reembolso.";
    public static final String MSG_RECHAZO =
        "ONVO rechazó el reembolso. No se devolvió nada y el pedido sigue como estaba.";
    public static final String MSG_RECHAZO_DEFINITIVO =
        "ONVO rechazó el reembolso (%s). No se devolvió nada. El pago quedó en REEMBOLSO_PENDIENTE. "
            + "Revisá el pago en el panel de ONVO antes de volver a intentarlo.";
    public static final String MSG_INTENT_NO_SUCCEEDED =
        "ONVO informa la intención de pago en «%s», no en succeeded. No se cancela un cobro ya capturado: "
            + "el reembolso es POST /v1/refunds. El pago quedó en REEMBOLSO_PENDIENTE.";
    public static final String MSG_MONTO =
        "El monto o la moneda de ONVO no coinciden con el cobro (el reembolso va en céntimos CRC). "
            + "No se pidió el reembolso. El pago quedó en REEMBOLSO_PENDIENTE.";
    public static final String MSG_YA_HAY_REFUND =
        "ONVO ya tiene un reembolso de este cobro. No se pidió otro. El pago sigue en REEMBOLSO_PENDIENTE.";
    /**
     * ONVO TEST lo devolvió en el pedido 34 y en los pedidos 10, 21 y 49 con el intent {@code succeeded},
     * {@code receivedAmount} igual al total y sin un refund {@code succeeded}. No está en openapi.yaml ni en
     * docs.onvopay.com/reference/errors. El POST ya era el del ejemplo (paymentIntentId + amount en céntimos).
     */
    static final String CODIGO_YA_PAGADO = "refunds.payment_intent_already_payed";
    public static final String MSG_ONVO_NO_DEVUELVE =
        "ONVO rechazó el reembolso (" + CODIGO_YA_PAGADO + "). El cobro sigue succeeded y no hay un refund "
            + "confirmado: no se devolvió la plata. La API pública solo tiene POST /v1/refunds "
            + "(paymentIntentId y amount); no hay otro endpoint. El pago queda en REEMBOLSO_PENDIENTE.";
    private static final String INTENT_REEMBOLSADO = "refunded";
    private static final String INTENT_PARCIAL = "partially_refunded";
    private static final String INTENT_CAPTURADO = "succeeded";
    /** Se commitea bajo lock antes del POST. Si el llamado no termina en 4xx, el siguiente intento no repite. */
    static final String MARCA_EN_VUELO = "EN_VUELO";
    private static final long CENTIMOS_POR_COLON = 100L;
    public static final String MSG_EN_DUDA =
        "ONVO no confirmó el reembolso. El pedido quedó en REEMBOLSO_PENDIENTE (no se marcó como devuelto). "
        + "Revisá el panel de ONVO antes de reintentar.";
    public static final String MSG_CAMBIO =
        "El pedido cambió mientras se preparaba el reembolso. No se pidió nada; volvé a intentar.";
    public static final String MSG_REVISAR = "Revisá en ONVO antes de reintentar.";
    public static final String MSG_EN_DUDA_PREVIO =
        "Hay un reembolso por ONVO sin confirmar para este pedido y no se pidió otro. " + MSG_REVISAR
        + " Después registrá el resultado con la resolución manual.";
    public static final String MSG_MANUAL_NO_PENDIENTE = "Este pedido no tiene un reembolso por ONVO pendiente.";
    public static final String MSG_MANUAL_SIN_CONFIRMAR =
        "Para marcarlo como devuelto tenés que confirmar explícitamente que lo viste devuelto en ONVO.";
    public static final String MSG_MANUAL_ONVO_NO_DEVUELTO =
        "ONVO informa que ese reembolso no se hizo (fallido o cancelado). No se puede marcar como devuelto.";
    public static final String MSG_MANUAL_DEVUELTO = "Registrado: el reembolso quedó como devuelto (confirmado a mano).";
    public static final String MSG_MANUAL_NO_DEVUELTO = "Registrado: no se devolvió nada y el pedido volvió a su estado anterior.";
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

    /** ambiguo: ya se llamó a ONVO y no quedó ni id ni un 4xx. No se repite el POST. */
    private record Preparado(Long pagoId, String intentId, String refundIdExistente, String numeroPedido,
                             String idempotencyKey, Integer monto, String moneda, boolean ambiguo) {}

    /** reconsulta = ya hay un refund con id para releer; no hace falta el intent. */
    private record Lectura(String token, boolean reconsulta, boolean pendiente) {}

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
        // Con id de refund solo se reconsulta. Sin id (aunque ya esté REEMBOLSO_PENDIENTE) hace falta el intent.
        String intentId = l.reconsulta() ? null : intentDe(l.token());
        // 2) Con el lock se revalida todo (estado, pago, mismo token) y recién ahí se pasa a REEMBOLSO_PENDIENTE.
        Preparado p = tx.execute(s -> preparar(pedidoId, l.token(), intentId));
        if (p.refundIdExistente() != null) return reconsultar(pedidoId, p, operador);
        return pedirNuevo(pedidoId, p, operador);
    }

    private Resultado reconsultar(Long pedidoId, Preparado p, String operador) {
        OnvoReembolso r;
        try {
            r = onvoService.obtenerReembolso(p.refundIdExistente());
        } catch (HttpClientErrorException e) {
            log.warn("[reembolso] No se pudo leer el refund {}: {}",
                OnvoService.enmascarar(p.refundIdExistente()), e.getStatusCode());
            throw new ReembolsoException(502, MSG_EN_DUDA);
        } catch (RuntimeException e) {
            log.error("[reembolso] Reembolso ONVO del pedido {} sin respuesta clara: {}", pedidoId, e.getClass().getSimpleName());
            throw new ReembolsoException(502, MSG_EN_DUDA);
        }
        return exigirOk(tx.execute(s -> aplicar(pedidoId, p.pagoId(), r, operador)));
    }

    /** POST /v1/refunds solo con un intent succeeded y el monto capturado en céntimos. Nunca cancela el intent. */
    private Resultado pedirNuevo(Long pedidoId, Preparado p, String operador) {
        Map<?, ?> intent = leerIntent(p.intentId());
        if (intent == null) throw new ReembolsoException(502, MSG_EN_DUDA);
        Resultado ya = siOnvoYaReembolso(pedidoId, p, intent, operador);
        if (ya != null) return ya;
        if (rechazoTerminalGuardado(p.pagoId())) {
            throw new ReembolsoException(409, MSG_ONVO_NO_DEVUELVE);
        }
        if (reembolsoYaEnOnvo(p, intent)) {
            tx.executeWithoutResult(s -> guardarError(p.pagoId(), MSG_YA_HAY_REFUND));
            throw new ReembolsoException(409, MSG_YA_HAY_REFUND);
        }
        if (p.ambiguo()) throw new ReembolsoException(409, mensajeReplay(null));
        String problema = problemaDeCobro(p, intent);
        if (problema != null) {
            tx.executeWithoutResult(s -> guardarError(p.pagoId(), problema));
            throw new ReembolsoException(422, problema);
        }
        reclamarPost(pedidoId, p.pagoId());
        try {
            OnvoReembolso r = onvoService.crearReembolso(p.intentId(), "Reembolso pedido " + p.numeroPedido(),
                p.idempotencyKey(), p.monto().longValue() * CENTIMOS_POR_COLON);
            return exigirOk(tx.execute(s -> aplicar(pedidoId, p.pagoId(), r, operador)));
        } catch (HttpClientErrorException e) {
            return rechazoHttp(pedidoId, p, e, operador);
        } catch (RuntimeException e) {
            if (e instanceof ReembolsoException) throw e;
            log.error("[reembolso] Reembolso ONVO del pedido {} sin respuesta clara: {}", pedidoId, e.getClass().getSimpleName());
            throw new ReembolsoException(502, MSG_EN_DUDA);
        }
    }

    /** 4xx de negocio: queda REEMBOLSO_PENDIENTE con el motivo. 401/403 son de la llave: se revierte para poder reintentar. */
    private Resultado rechazoHttp(Long pedidoId, Preparado p, HttpClientErrorException e, String operador) {
        String motivo = OnvoService.motivoOnvo(e.getResponseBodyAsString());
        log.warn("[reembolso] ONVO rechazó el reembolso del pedido {}: {} {}", pedidoId, e.getStatusCode(), motivo);
        int sc = e.getStatusCode().value();
        if (sc == 401 || sc == 403) {
            tx.executeWithoutResult(s -> revertir(pedidoId, p));
            throw new ReembolsoException(502, MSG_RECHAZO);
        }
        if (motivo.contains(CODIGO_YA_PAGADO)) {
            Map<?, ?> otraVez = leerIntent(p.intentId());
            Resultado ya = siOnvoYaReembolso(pedidoId, p, otraVez, operador);
            if (ya != null) return ya;
            if (capturadoEntero(p, otraVez)) {
                tx.executeWithoutResult(s -> guardarError(p.pagoId(), MSG_ONVO_NO_DEVUELVE));
                throw new ReembolsoException(422, MSG_ONVO_NO_DEVUELVE);
            }
        }
        tx.executeWithoutResult(s -> guardarError(p.pagoId(), motivo));
        throw new ReembolsoException(422, String.format(MSG_RECHAZO_DEFINITIVO, motivo));
    }

    /** null si el GET falló (no se sabe). Mapa vacío si ONVO no devolvió el intent. */
    private Map<?, ?> leerIntent(String intentId) {
        try {
            Map<?, ?> intent = onvoService.obtenerPaymentIntent(intentId);
            return intent == null ? Map.of() : intent;
        } catch (RuntimeException e) {
            log.warn("[reembolso] No se pudo leer el intent {}: {}",
                OnvoService.enmascarar(intentId), e.getClass().getSimpleName());
            return null;
        }
    }

    /**
     * El GET dice {@code refunded} y el monto que ya no quedó en el intent es el del pago
     * ({@code receivedAmount} en 0 y {@code amount} igual a los céntimos locales). Si no, no se marca devuelto.
     */
    private Resultado siOnvoYaReembolso(Long pedidoId, Preparado p, Map<?, ?> intent, String operador) {
        if (intent == null || !INTENT_REEMBOLSADO.equals(estadoIntent(intent))) return null;
        if (!montoDevueltoCoincide(p, intent)) {
            log.warn("[reembolso] Pedido {}: ONVO informa refunded pero el monto devuelto no es el del pago", pedidoId);
            tx.executeWithoutResult(s -> guardarError(p.pagoId(), MSG_YA_HAY_REFUND));
            throw new ReembolsoException(409, MSG_YA_HAY_REFUND);
        }
        log.info("[reembolso] Pedido {}: ONVO ya devolvió el monto del pago; no se pide otro refund", pedidoId);
        return exigirOk(tx.execute(s -> aplicar(pedidoId, p.pagoId(), new OnvoReembolso(null, INTENT_CAPTURADO), operador)));
    }

    /** Intent succeeded y el monto recibido sigue siendo el total: ONVO no devolvió nada. */
    private static boolean capturadoEntero(Preparado p, Map<?, ?> intent) {
        if (intent == null || !INTENT_CAPTURADO.equals(estadoIntent(intent)) || !montoCoincide(p, intent)) return false;
        Object recibido = intent.get("receivedAmount");
        if (recibido == null) return true;
        try {
            long queda = new java.math.BigDecimal(String.valueOf(recibido)).longValueExact();
            return queda == p.monto().longValue() * CENTIMOS_POR_COLON;
        } catch (ArithmeticException | NumberFormatException e) {
            return false;
        }
    }

    private boolean rechazoTerminalGuardado(Long pagoId) {
        String error = tx.execute(s -> pagoRepository.findById(pagoId).map(Pago::getReembolsoError).orElse(null));
        return error != null && error.contains(CODIGO_YA_PAGADO);
    }

    /** amount del intent = céntimos del pago y receivedAmount = 0: se devolvió todo ese cobro. */
    private static boolean montoDevueltoCoincide(Preparado p, Map<?, ?> intent) {
        if (!montoCoincide(p, intent) || intent.get("receivedAmount") == null) return false;
        try {
            long queda = new java.math.BigDecimal(String.valueOf(intent.get("receivedAmount"))).longValueExact();
            return queda == 0L;
        } catch (ArithmeticException | NumberFormatException e) {
            return false;
        }
    }

    /**
     * Lock de la fila y commit de {@code EN_VUELO} antes del POST. El otro admin, o un reintento
     * después de un timeout/5xx, lo ve y no manda otro refund. Un 4xx definitivo pisa la marca con el motivo.
     */
    private void reclamarPost(Long pedidoId, Long pagoId) {
        tx.executeWithoutResult(s -> {
            pedidoRepository.findByIdForUpdate(pedidoId)
                .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
            Pago pago = pagoRepository.findById(pagoId)
                .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
            if (pago.getOnvoReembolsoId() != null || MARCA_EN_VUELO.equals(pago.getReembolsoError())) {
                throw new ReembolsoException(409, MSG_EN_DUDA_PREVIO);
            }
            pago.setReembolsoError(MARCA_EN_VUELO);
            pagoRepository.save(pago);
        });
    }

    private static String problemaDeCobro(Preparado p, Map<?, ?> intent) {
        String status = estadoIntent(intent);
        if (!INTENT_CAPTURADO.equals(status)) {
            return String.format(MSG_INTENT_NO_SUCCEEDED, status.isBlank() ? "desconocido" : status);
        }
        return montoCoincide(p, intent) ? null : MSG_MONTO;
    }

    private static boolean montoCoincide(Preparado p, Map<?, ?> intent) {
        if (p.monto() == null || p.monto() <= 0) return false;
        Pago probe = new Pago();
        probe.setMonto(p.monto());
        probe.setMoneda(p.moneda());
        return OnvoCobroVerificador.coincide(probe, intent);
    }

    private static String estadoIntent(Map<?, ?> intent) {
        if (intent == null || intent.isEmpty()) return "";
        Object v = intent.get("status");
        if (v == null) return "";
        String s = String.valueOf(v).toLowerCase(Locale.ROOT).trim();
        return s.length() > 40 ? s.substring(0, 40) : s;
    }

    private void guardarError(Long pagoId, String error) {
        Pago pago = pagoRepository.findById(pagoId).orElse(null);
        if (pago == null) return;
        String texto = error == null ? "" : error;
        pago.setReembolsoError(texto.length() > 300 ? texto.substring(0, 300) : texto);
        pagoRepository.save(pago);
    }

    private static Resultado exigirOk(Resultado res) {
        if (res != null && res.status() >= 400) throw new ReembolsoException(res.status(), res.mensaje());
        return res;
    }

    static String mensajeReplay(String error) {
        if (error == null || error.isBlank()) return MSG_EN_DUDA_PREVIO;
        return MSG_EN_DUDA_PREVIO + " Motivo de ONVO: " + error;
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
            // BAJO Seguridad: un refund failed sin estado previo guardado deja el pago REEMBOLSO_PENDIENTE; eso no
            // está resuelto, así que PENDIENTE (409) para que ONVO reintente, igual que un pending.
            if (res.status() == 202 || Constants.PAGO_REEMBOLSO_PENDIENTE.equals(pago.getEstadoPago())) {
                return WebhookResultado.PENDIENTE;
            }
            return WebhookResultado.RESUELTO;
        });
    }

    /** Resultado de la revisión manual en el panel de ONVO. */
    public enum ResolucionManual { DEVUELTO, NO_DEVUELTO }

    /**
     * Resolución manual (ADMIN) de un reembolso pendiente, tras revisarlo en ONVO. Registra quién y cuándo (V228).
     * DEVUELTO exige {@code confirmado=true}: pago REEMBOLSADO, pedido CANCELADO y stock repuesto una sola vez.
     * NO_DEVUELTO restaura el estado previo real (sin estado guardado, queda pendiente y 409).
     */
    public Resultado resolverManual(Long pedidoId, ResolucionManual resolucion, boolean confirmado, String operador) {
        if (resolucion == null) throw new ReembolsoException(400, "Falta el resultado (DEVUELTO o NO_DEVUELTO).");
        if (resolucion == ResolucionManual.DEVUELTO && !confirmado) throw new ReembolsoException(400, MSG_MANUAL_SIN_CONFIRMAR);
        if (resolucion == ResolucionManual.DEVUELTO) bloquearSiOnvoDiceNoDevuelto(pedidoId);
        return tx.execute(st -> {
            Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
                .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
            Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
            if (pago == null || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor()) || !pendiente(pedido, pago)) {
                throw new ReembolsoException(409, MSG_MANUAL_NO_PENDIENTE);
            }
            String quien = operador == null || operador.isBlank() ? "ADMIN" : operador;
            String mensaje;
            if (resolucion == ResolucionManual.DEVUELTO) {
                pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
                pago.setMontoReembolsado(pago.getMonto());
                pago.setMontoReembolsoPendiente(0);
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                stockService.reponerSiCorresponde(this, pedido, quien);
                mensaje = MSG_MANUAL_DEVUELTO;
            } else {
                if (!restaurar(pedido, pago)) throw new ReembolsoException(409, MSG_EN_DUDA);
                mensaje = MSG_MANUAL_NO_DEVUELTO;
            }
            pago.setReembolsoResueltoPor(quien.length() > 120 ? quien.substring(0, 120) : quien);
            pago.setReembolsoResueltoEn(LocalDateTime.now(Constants.ZONA_CR));
            pago.setReembolsoResolucion(resolucion.name());
            pedidoRepository.save(pedido);
            pagoRepository.save(pago);
            log.info("[reembolso] Pedido {} resuelto a mano: {}", pedido.getId(), resolucion);
            return new Resultado(200, mensaje, pedido.getEstadoPedido(), pago.getEstadoPago());
        });
    }

    /**
     * BAJO Seguridad: antes de marcar DEVUELTO a mano se relee el refund en ONVO (best-effort, fuera de la
     * transacción). Si ONVO dice explícitamente que no se hizo (failed/canceled) se bloquea con 409. Sin id de
     * refund, sin llave o si ONVO no responde, manda la revisión del admin (no se bloquea).
     */
    private void bloquearSiOnvoDiceNoDevuelto(Long pedidoId) {
        String refundId;
        try {
            refundId = tx.execute(s -> pedidoRepository.findById(pedidoId)
                .flatMap(p -> CompraPaquetes.pagoDe(p, pagoRepository))
                .map(Pago::getOnvoReembolsoId).orElse(null));
        } catch (RuntimeException e) {
            return;
        }
        if (refundId == null || !onvoService.reembolsable(refundId)) return;
        OnvoReembolso r;
        try {
            r = onvoService.obtenerReembolso(refundId);
        } catch (RuntimeException e) {
            log.warn("[reembolso] Resolución manual: no se pudo releer el refund {} ({})",
                OnvoService.enmascarar(refundId), e.getClass().getSimpleName());
            return;
        }
        if (r == null || !refundId.equals(r.id()) || r.status() == null) return;
        String st = r.status().toLowerCase(Locale.ROOT);
        if ("failed".equals(st) || "canceled".equals(st) || "cancelled".equals(st)) {
            log.warn("[reembolso] Pedido {}: DEVUELTO manual bloqueado, ONVO informa el refund como {}", pedidoId, st);
            throw new ReembolsoException(409, MSG_MANUAL_ONVO_NO_DEVUELTO);
        }
    }

    private Lectura leer(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
        boolean reconsulta = pago != null && pago.getOnvoReembolsoId() != null && pendiente(pedido, pago);
        return new Lectura(pago == null ? null : pago.getMerchantToken(), reconsulta,
            pago != null && pendiente(pedido, pago));
    }

    private Preparado preparar(Long pedidoId, String tokenLeido, String intentId) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ReembolsoException(404, MSG_NO_EXISTE));
        String estado = PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido());
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository).orElse(null);
        boolean onvo = pago != null && Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor());

        if (onvo && pendiente(pedido, pago)) {
            if (pago.getOnvoReembolsoId() != null) {
                return new Preparado(pago.getId(), null, pago.getOnvoReembolsoId(), pedido.getNumeroPedido(),
                    null, null, null, false);
            }
            return primerRefundDePendiente(pedido, pago, tokenLeido, intentId);
        }
        if (Constants.PEDIDO_REEMBOLSO_PENDIENTE.equals(estado)) {
            throw new ReembolsoException(409, MSG_EN_DUDA_PREVIO);
        }
        if (pago != null && Constants.PAGO_REEMBOLSADO.equals(pago.getEstadoPago())) {
            throw new ReembolsoException(409, MSG_YA_REEMBOLSADO);
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
        return new Preparado(pago.getId(), intentId, null, pedido.getNumeroPedido(), key, pago.getMonto(), pago.getMoneda(), false);
    }

    /**
     * REEMBOLSO_PENDIENTE sin id: el cobro sobre un pedido ya cancelado nunca llamó a /refunds.
     * Se arma el primer POST con la misma Idempotency-Key si ya había una. Si el intento anterior
     * no tuvo respuesta clara, queda marcado ambiguo y pedirNuevo no repite el POST.
     */
    private Preparado primerRefundDePendiente(Pedido pedido, Pago pago, String tokenLeido, String intentId) {
        if (CompraPaquetes.paquetesDe(pedido, pedidoRepository).size() > 1) {
            throw new ReembolsoException(409, MSG_VARIOS_PAQUETES);
        }
        if (tokenLeido == null || !tokenLeido.equals(pago.getMerchantToken())) {
            throw new ReembolsoException(409, intentId == null && tokenLeido == null ? MSG_SIN_INTENT : MSG_CAMBIO);
        }
        if (intentId == null || !onvoService.reembolsable(intentId)) {
            throw new ReembolsoException(409, MSG_SIN_INTENT);
        }
        boolean ambiguo = intentoAmbiguo(pago);
        String key = pago.getReembolsoIdempotencyKey();
        if (!ambiguo && key == null) {
            key = idempotencyKey(pago.getId(), LocalDateTime.now());
            pago.setReembolsoIdempotencyKey(key);
            pagoRepository.save(pago);
        }
        return new Preparado(pago.getId(), intentId, null, pedido.getNumeroPedido(), key,
            pago.getMonto(), pago.getMoneda(), ambiguo);
    }

    /** Clave guardada y sin un 4xx definitivo: el POST pudo haber creado un refund que no registramos. */
    private static boolean intentoAmbiguo(Pago pago) {
        if (pago.getReembolsoIdempotencyKey() == null) return false;
        String error = pago.getReembolsoError();
        return error == null || error.isBlank() || MARCA_EN_VUELO.equals(error);
    }

    /** OpenAPI PaymentIntent: refunded, partially_refunded, o receivedAmount menor al capturado. */
    private static boolean reembolsoYaEnOnvo(Preparado p, Map<?, ?> intent) {
        String status = estadoIntent(intent);
        if (INTENT_REEMBOLSADO.equals(status) || INTENT_PARCIAL.equals(status)) return true;
        Object recibido = intent.get("receivedAmount");
        if (recibido == null || p.monto() == null || p.monto() <= 0) return false;
        try {
            long centimos = new java.math.BigDecimal(String.valueOf(recibido)).longValueExact();
            return centimos < p.monto().longValue() * CENTIMOS_POR_COLON;
        } catch (ArithmeticException | NumberFormatException e) {
            return true;
        }
    }

    /** Reembolso en curso: el pedido o el pago (si el pedido ya estaba CANCELADO) en REEMBOLSO_PENDIENTE. */
    private static boolean pendiente(Pedido pedido, Pago pago) {
        return Constants.PEDIDO_REEMBOLSO_PENDIENTE.equals(PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido()))
            || (pago != null && Constants.PAGO_REEMBOLSO_PENDIENTE.equals(pago.getEstadoPago()));
    }

    /**
     * Clave estable del intento (pago + momento). Queda en el pago (V228) y se reutiliza: no se manda
     * como header porque openapi.yaml no lo documenta y un POST con Idempotency-Key dio 400 en QA.
     * La idempotencia contra un doble refund es leer el payment intent antes de crear otro.
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
        if (r.id() != null) pago.setOnvoReembolsoId(r.id());
        String status = r.status() == null ? "" : r.status().toLowerCase(Locale.ROOT);
        switch (status) {
            case "succeeded" -> {
                pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
                pago.setMontoReembolsado(pago.getMonto());
                pago.setMontoReembolsoPendiente(0);
                pago.setReembolsoError(null);
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
        pago.setReembolsoError(null);
        return true;
    }
}
