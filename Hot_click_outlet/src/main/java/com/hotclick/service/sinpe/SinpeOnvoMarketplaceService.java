package com.hotclick.service.sinpe;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.WebhookEvent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PaymentFailureHandler;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.service.pos.PosSinpeOnvoService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * P-01: SINPE Móvil del marketplace por ONVO (payment intent + método {@code mobile_number}), igual que el POS.
 * <ul>
 *   <li>Un intent por grupo multinegocio (un Pago), monto exacto en céntimos de CRC, destino de config.</li>
 *   <li>El Pago guarda {@code ONVOPI:<id>} en merchantToken; el webhook se resuelve por ese id, nunca por metadata.</li>
 *   <li>Pagado solo con {@code succeeded} releído por GET; {@code deferred}/{@code processing} = esperar.</li>
 *   <li>Dedupe por tipo de evento + {@code data.id} (ONVO no manda id de evento) con la fila del pago FOR UPDATE.</li>
 *   <li>Fuera de orden: un {@code failed}/{@code deferred} después de {@code succeeded} no revierte nada.</li>
 *   <li>Vencimiento: ONVO no lo define. {@code sinpe.onvo.timeout-minutos} es un plazo interno de HotClick
 *       (columna V195); cumplido, se cancela el intent y el stock se libera solo si un GET confirma canceled.</li>
 *   <li>Fail-closed: sin ONVO, en modo simulado, sin destino o sin plazo válido no se crea el pedido.</li>
 * </ul>
 */
@Service
public class SinpeOnvoMarketplaceService {

    private static final Logger log = LoggerFactory.getLogger(SinpeOnvoMarketplaceService.class);

    public static final String PREFIJO = PosSinpeOnvoService.PREFIJO_ONVO_PI;
    public static final String MSG_NO_DISPONIBLE = SinpeCheckoutService.MSG_SINPE_SIN_DESTINO;
    public static final String MSG_IDENTIFICACION = PosSinpeOnvoService.MSG_IDENTIFICACION;
    /** Tope del plazo interno (un día); fuera de 1..MAX el SINPE no se ofrece. */
    static final int MAX_MINUTOS = 24 * 60;

    public enum Resultado { CONFIRMADO, DUPLICADO, COBRADO_SOBRE_CANCELADO, EN_ESPERA, NO_VERIFICADO, NO_ENCONTRADO, NO_CONSULTABLE }

    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private PedidoGrupoService pedidoGrupoService;
    @Autowired private PaymentFailureHandler paymentFailureHandler;
    @Lazy @Autowired private PaymentService paymentService;
    @Autowired(required = false) private OnvoService onvoService;

    @Value("${sinpe.onvo.timeout-minutos:}")
    private String timeoutMinutosCrudo;

    private volatile Clock clock = Clock.system(Constants.ZONA_CR);

    void setClock(Clock c) { this.clock = Objects.requireNonNull(c); }
    void setTimeoutMinutosParaTest(String v) { this.timeoutMinutosCrudo = v; }
    void setOnvoServiceParaTest(OnvoService o) { this.onvoService = o; }

    int timeoutMinutos() {
        if (timeoutMinutosCrudo == null || timeoutMinutosCrudo.isBlank()) return 0;
        try {
            int v = Integer.parseInt(timeoutMinutosCrudo.trim());
            return v >= 1 && v <= MAX_MINUTOS ? v : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** Destino ONVO si se puede cobrar SINPE ahora; "" si no (sin ONVO, simulado, sin destino o sin plazo). */
    public String destinoDisponible() {
        OnvoService onvo = onvoService;
        if (onvo == null || !onvo.isPagosDisponibles() || onvo.isMockMode() || timeoutMinutos() == 0) return "";
        String d = onvo.sinpeDestino();
        return d == null ? "" : d.trim();
    }

    /** Valida identificación (con guiones, mín. 12) y tipo antes de reservar stock. */
    public static void exigirIdentificacion(String identificacion, Integer tipo) {
        if (!OnvoService.identificacionSinpeValida(identificacion) || !OnvoService.tipoIdentificacionValido(tipo)) {
            throw new IllegalArgumentException(MSG_IDENTIFICACION);
        }
    }

    /**
     * Crea y confirma el intent del grupo para el Pago ya guardado. El id del intent y el plazo interno se
     * guardan antes de confirmar. Devuelve el plazo interno.
     * SCALE1: corre dentro de la transacción del checkout (MANDATORY) con el Pago gestionado; los cambios
     * se escriben por dirty checking en un solo UPDATE al flush, sin save()/merge por pago.
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public LocalDateTime iniciar(Pago pago, String identificacion, Integer tipo) {
        exigirIdentificacion(identificacion, tipo);
        if (destinoDisponible().isEmpty() || pago.getMonto() == null || pago.getMonto() <= 0) {
            throw new IllegalStateException(MSG_NO_DISPONIBLE);
        }
        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("origen", "marketplace-sinpe");
        metadata.put("pagoId", String.valueOf(pago.getId()));
        String numero = pago.getPedido() != null ? pago.getPedido().getNumeroPedido() : String.valueOf(pago.getId());
        OnvoService.OnvoPaymentIntent intent = onvoService.crearPaymentIntent(pago.getMonto(), "Pedido " + numero, metadata);
        LocalDateTime plazo = LocalDateTime.now(clock).plusMinutes(timeoutMinutos());
        pago.setMerchantToken(PREFIJO + intent.id());
        pago.setPlazoInternoSinpe(plazo);
        pago.setFechaActualizacion(LocalDateTime.now(clock));
        OnvoService.OnvoPaymentMethod metodo = onvoService.crearMetodoPagoSinpePos(identificacion, tipo, null);
        onvoService.confirmarPaymentIntent(intent.id(), metodo.id());
        log.info("[SINPE-ONVO] Intent confirmado pedido={} plazoInterno={}", numero, plazo);
        return plazo;
    }

    /**
     * Webhook {@code payment-intent.succeeded}: con la fila del pago bloqueada, dedupe por (tipo, data.id),
     * GET del intent y captura solo con succeeded + monto/moneda/modo exactos.
     */
    @Transactional
    public Resultado confirmarPorWebhook(String tipo, String intentId) {
        if (intentId == null || intentId.isBlank()) return Resultado.NO_ENCONTRADO;
        String token = PREFIJO + intentId;
        Pago pago = pagoRepository.findByMerchantTokenForUpdate(token).orElse(null);
        if (pago == null || !Constants.PROVEEDOR_SINPE.equals(pago.getProveedor())) return Resultado.NO_ENCONTRADO;
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(token, tipo)
                || Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())
                || Constants.PAGO_REEMBOLSO_PENDIENTE.equals(pago.getEstadoPago())) {
            return Resultado.DUPLICADO;
        }
        OnvoService onvo = onvoService;
        if (onvo == null || onvo.isMockMode() || !onvo.isPagosDisponibles()) return Resultado.NO_CONSULTABLE;
        Map<?, ?> pi;
        try {
            pi = onvo.obtenerPaymentIntent(intentId);
        } catch (RuntimeException e) {
            log.warn("[SINPE-ONVO] No se pudo leer el intent {}: {}", intentId, e.getMessage());
            return Resultado.NO_CONSULTABLE;
        }
        PosSinpeOnvoService.EstadoIntent e = PosSinpeOnvoService.clasificar(pi, intentId, pago.getMonto(), onvo.modoEsperado());
        if (e == PosSinpeOnvoService.EstadoIntent.ESPERANDO) return Resultado.EN_ESPERA;
        if (e != PosSinpeOnvoService.EstadoIntent.PAGADO) return Resultado.NO_VERIFICADO;

        // SCALE1: el Pago viene gestionado (SELECT FOR UPDATE): sus cambios salen por dirty checking, sin save().
        LocalDateTime ahora = LocalDateTime.now(clock);
        // Una sola consulta del grupo (delGrupo); cancelados y marca de prueba se resuelven en memoria.
        List<Pedido> pedidosGrupo = pago.getPedido() == null ? List.of() : pedidoGrupoService.delGrupo(pago.getPedido());
        if (!Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago()) || algunoCancelado(pedidosGrupo)) {
            pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            pago.setFechaActualizacion(ahora);
            registrarProcesado(token, tipo, "Cobro SINPE de ONVO sobre pedido cancelado: reembolso pendiente");
            log.error("[ALERTA-PAGO] ONVO cobró SINPE de un pedido ya cancelado; reembolso pendiente: pago={}", pago.getId());
            return Resultado.COBRADO_SOBRE_CANCELADO;
        }
        marcarSiEsPrueba(onvo, pedidosGrupo, pago);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo(Constants.PROVEEDOR_SINPE);
        pago.setFechaActualizacion(ahora);
        paymentService.confirmarPedido(pago);
        registrarProcesado(token, tipo, null);
        log.info("[SINPE-ONVO] Pago {} confirmado por webhook + GET", pago.getId());
        return Resultado.CONFIRMADO;
    }

    /**
     * {@code payment-intent.failed}/{@code deferred} de un pago marketplace: nunca revierte (puede llegar después
     * de succeeded) ni libera stock; eso queda para el barrido, que exige canceled por GET. Devuelve false si el
     * intent no es de un pago marketplace.
     */
    @Transactional(readOnly = true)
    public boolean esDelMarketplace(String intentId) {
        if (intentId == null || intentId.isBlank()) return false;
        return pagoRepository.findByMerchantToken(PREFIJO + intentId)
            .filter(p -> Constants.PROVEEDOR_SINPE.equals(p.getProveedor())).isPresent();
    }

    /** Pagos con el plazo interno cumplido. */
    public List<Pago> vencidos() {
        return pagoRepository.findByProveedorAndEstadoPagoAndMerchantTokenStartingWithAndPlazoInternoSinpeBefore(
            Constants.PROVEEDOR_SINPE, Constants.PAGO_PENDIENTE, PREFIJO, LocalDateTime.now(clock));
    }

    /**
     * Plazo cumplido: POST cancel y luego GET. Libera stock (marcarFallido) solo si el GET dice canceled.
     * Si el GET dice succeeded no toca nada (lo cierra el webhook). true = liberado.
     */
    public boolean cancelarVencido(Pago pago) {
        String token = pago.getMerchantToken();
        if (token == null || !token.startsWith(PREFIJO)) return false;
        String intentId = token.substring(PREFIJO.length());
        OnvoService onvo = onvoService;
        if (onvo == null || onvo.isMockMode() || !onvo.isPagosDisponibles()) return false;
        String statusPrevio = estadoPorGet(onvo, intentId);
        if ("succeeded".equalsIgnoreCase(statusPrevio)) {
            log.info("[SINPE-ONVO] Pago {} vencido pero succeeded en ONVO; se espera el webhook", pago.getId());
            return false;
        }
        if (!"canceled".equalsIgnoreCase(statusPrevio)) onvo.cancelarPaymentIntent(intentId);
        String status = estadoPorGet(onvo, intentId);
        if (!"canceled".equalsIgnoreCase(status)) {
            log.warn("[SINPE-ONVO] Intent del pago {} sin cancelar por GET (status={}); se reintenta", pago.getId(), status);
            return false;
        }
        paymentFailureHandler.marcarFallido(pago, "Plazo interno de pago SINPE vencido");
        return true;
    }

    private static String estadoPorGet(OnvoService onvo, String intentId) {
        try {
            Map<?, ?> pi = onvo.obtenerPaymentIntent(intentId);
            if (pi == null || !intentId.equals(String.valueOf(pi.get("id")))) return "";
            Object s = pi.get("status");
            return s == null ? "" : String.valueOf(s);
        } catch (RuntimeException e) {
            return "";
        }
    }

    private static boolean algunoCancelado(List<Pedido> pedidosGrupo) {
        return pedidosGrupo.stream().anyMatch(p -> Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()));
    }

    /**
     * P-04: misma regla que {@code OnvoCapturaService.marcarSiEsPrueba}. Con llave de prueba (modo esperado
     * distinto de live) todos los pedidos del grupo quedan es_prueba, en esta misma transacción. SCALE1: los
     * pedidos están gestionados; el dirty checking los persiste en el commit, sin save por pedido.
     */
    private static void marcarSiEsPrueba(OnvoService onvo, List<Pedido> pedidosGrupo, Pago pago) {
        if ("live".equals(onvo.modoEsperado())) return;
        pedidosGrupo.forEach(p -> p.setEsPrueba(true));
        log.warn("[ALERTA-PAGO] SINPE ONVO cobrado con llave de prueba: pedidos marcados es_prueba. pago={}", pago.getId());
    }

    /** SCALE1: el evento se inserta ya cerrado, en un solo INSERT (antes INSERT + UPDATE). */
    private WebhookEvent registrarProcesado(String token, String tipo, String error) {
        WebhookEvent ev = new WebhookEvent();
        ev.setMerchantToken(token);
        ev.setEventoTipo(tipo);
        ev.setPayloadRaw("{}");
        ev.setIpOrigen("webhook");
        ev.setFechaRecepcion(LocalDateTime.now(clock));
        ev.setEstado(Constants.ESTADO_ACTIVO);
        ev.setErrorProcesamiento(error);
        ev.setProcesado(true);
        ev.setProcesadoEn(LocalDateTime.now(clock));
        return webhookEventRepository.save(ev);
    }
}
