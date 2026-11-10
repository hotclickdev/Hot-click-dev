package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.payment.OnvoCobroVerificador;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class OnvoPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(OnvoPaymentProvider.class);
    static final String EVENTO_SESION = "checkout-session.succeeded";
    static final String EVENTO_INTENT_FALLIDO = "payment-intent.failed";

    /** Resultado de reconsultar a ONVO antes de confirmar un pedido. */
    public enum Verificacion {
        OK, DUPLICADO, EN_PROCESO, NO_PAGADO, NO_ENCONTRADO, DATOS_DISTINTOS,
        /** Sin llave utilizable (borrada, o de prueba fuera de dev/test): no se pudo preguntar a ONVO. */
        NO_CONSULTABLE,
        /** ONVO cobró un pedido ya cancelado: no se vende, el pago queda REEMBOLSO_PENDIENTE. */
        COBRADO_SOBRE_CANCELADO,
        /** M-08: cobrado sin stock; pedido en revisión y reembolso pendiente. */
        COBRADO_SOBREVENTA
    }

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired private OnvoService            onvoService;
    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private OnvoCapturaService     onvoCapturaService;
    @Autowired private com.hotclick.service.payment.PedidoStatusTokenService pedidoStatusTokenService;
    @Autowired(required = false) private com.hotclick.service.onvo.cuenta.CuentaOnvoService cuentaOnvoService;

    @Override
    public String getNombre() {
        return "ONVO";
    }

    /**
     * Crea una Checkout Session hospedada en ONVO en CRC nativo (sin conversión de moneda).
     */
    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) throws Exception {
        if (onvoService.isMockMode() || !onvoService.isPagosDisponibles()) {
            throw new IllegalStateException(
                "ONVO no está configurado. " +
                "Añade ONVO_SECRET_KEY (onvo_test_secret_key_...) al entorno para procesar pagos con tarjeta.",
                new IllegalStateException("ONVO_SECRET_KEY"));
        }

        if (pedido.getEmpresa() != null && pedido.getEmpresa().isCobrosPausados()) {
            // Sin sesión ni intención en ONVO: el comprador elige efectivo o contra entrega.
            throw new IllegalArgumentException(
                "Este negocio no acepta pagos en línea por ahora. Elegí otra forma de pago.");
        }

        String descripcion = "Pedido HOTCLICK " + pedido.getNumeroPedido();
        // st = token firmado de vida corta, solo para leer el estado sin sesión. No se registra en logs.
        String successUrl  = appUrl + "/pago/exito?order=" + pedido.getNumeroPedido()
            + "&st=" + java.net.URLEncoder.encode(pedidoStatusTokenService.emitir(pedido.getNumeroPedido()),
                java.nio.charset.StandardCharsets.UTF_8);
        String cancelUrl   = appUrl + "/pago/cancelado?order=" + pedido.getNumeroPedido();

        Map<String, String> metadata = Map.of(
            "pedidoId",     String.valueOf(pedido.getId()),
            "numeroPedido", pedido.getNumeroPedido()
        );

        // onBehalfOf solo con cuenta conectada ACTIVA (confirmada por GET a ONVO). Si no, el cobro
        // sigue como hasta hoy a nombre de la plataforma: no se bloquea ni se inventa una cuenta.
        String onBehalfOf = cuentaOnvoService != null ? cuentaOnvoService.onBehalfOfPara(pedido.getEmpresa()) : null;
        OnvoService.OnvoCheckoutSession session = onBehalfOf == null
            ? onvoService.crearCheckoutSession(pedido.getTotalPedido(), descripcion, successUrl, cancelUrl,
                usuario.getCorreo(), metadata)
            : onvoService.crearCheckoutSession(pedido.getTotalPedido(), descripcion, successUrl, cancelUrl,
                usuario.getCorreo(), metadata, onBehalfOf);

        log.info("[onvo] Checkout session creada: {} pedido={}", OnvoService.enmascarar(session.id()), pedido.getNumeroPedido());

        return new PaymentSession(session.id(), session.url());
    }

    /**
     * Confirma un pago ONVO solo si ONVO lo confirma por GET: la sesión está pagada, su payment intent
     * está en succeeded y el monto (en céntimos) y la moneda coinciden con el pago guardado.
     * Lo usan el webhook y la limpieza por expiración; el navegador nunca llega acá.
     * Sin transacción propia: las consultas a ONVO no retienen una conexión de base ni dejan en
     * rollback-only a quien llama; la escritura va en {@link OnvoCapturaService}. Idempotente por sessionId.
     */
    public Verificacion procesarPagoVerificado(String checkoutSessionId, String origen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(checkoutSessionId, EVENTO_SESION)) {
            log.info("[onvo] Sesión ya procesada: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
            return Verificacion.DUPLICADO;
        }
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || pago.getPedido() == null
                || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())) {
            log.warn("[onvo] Sesión sin pago ONVO local: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
            return Verificacion.NO_ENCONTRADO;
        }
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return Verificacion.DUPLICADO;
        }
        if (!onvoService.isPagosDisponibles()) {
            // Sin llave las lecturas dan vacío: eso no es «ONVO no la tiene» y no autoriza a cancelar.
            log.error("[ALERTA-PAGO] ONVO sin llave utilizable: no se puede verificar sessionId={}", OnvoService.enmascarar(checkoutSessionId));
            return Verificacion.NO_CONSULTABLE;
        }
        Map<?, ?> sesion = onvoService.obtenerCheckoutSession(checkoutSessionId);
        if (sesion.isEmpty()) {
            return Verificacion.NO_ENCONTRADO;
        }
        String intentId = OnvoCobroVerificador.paymentIntentId(sesion);
        recordarIntent(checkoutSessionId, intentId, pago.getOnvoPaymentIntentId());
        Map<?, ?> intent = onvoService.obtenerPaymentIntent(intentId);
        switch (OnvoCobroVerificador.decidir(pago, sesion, intent, onvoService.modoEsperado())) {
            case ACEPTAR -> {
                OnvoCapturaService.Captura captura = capturar(checkoutSessionId, intentId, origen);
                if (captura == OnvoCapturaService.Captura.CAPTURADO) guardarSinpeRef(checkoutSessionId, intentId);
                return switch (captura) {
                    case CAPTURADO -> Verificacion.OK;
                    case DUPLICADO -> Verificacion.DUPLICADO;
                    case COBRADO_SOBRE_CANCELADO -> Verificacion.COBRADO_SOBRE_CANCELADO;
                    case COBRADO_SOBREVENTA -> Verificacion.COBRADO_SOBREVENTA;
                };
            }
            case RECHAZAR_MONTO -> {
                log.error("[ALERTA-PAGO] {}", OnvoCobroVerificador.mensajeAlerta(pago, intent));
                return Verificacion.DATOS_DISTINTOS;
            }
            case RECHAZAR_MODO -> {
                log.error("[ALERTA-PAGO] ONVO devolvió un cobro de otro modo (test/live) que la llave: sessionId={}",
                    OnvoService.enmascarar(checkoutSessionId));
                return Verificacion.DATOS_DISTINTOS;
            }
            case EN_PROCESO -> {
                log.info("[onvo] Cobro todavía en proceso en ONVO: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
                return Verificacion.EN_PROCESO;
            }
            default -> {
                // Sin transacción el pedido es un proxy lazy: se loguea la sesión, no el número de pedido.
                log.info("[onvo] Sesión todavía sin cobro confirmado: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
                return Verificacion.NO_PAGADO;
            }
        }
    }

    /**
     * MEDIO limpieza (cobro capturado cancelado): qué dice el payment intent de la sesión justo antes de cancelar.
     * Solo {@code SIN_COBRO} autoriza a la limpieza a cancelar.
     */
    public enum CobroIntent {
        /**
         * ONVO confirma por GET que el intent no cobró y que ya no se puede pagar por el checkout: intent
         * {@code canceled}, o {@code requires_payment_method}/{@code requires_confirmation} con la sesión expired (o
         * inexistente, decidiendo el intent guardado). Lo único que autoriza a cancelar y liberar stock.
         */
        SIN_COBRO,
        /**
         * fix2 (BAJO requires_confirmation): el intent todavía no cobró, pero la sesión sigue abierta (no expired) y el
         * comprador puede pagar. No autoriza a cancelar ni a liberar: solo a expirar primero y volver a leer.
         */
        SIN_COBRO_SESION_ABIERTA,
        /**
         * fix2 (cancelación explícita): el intent cobró (mismo monto, moneda, modo e id) y quien llamó pidió NO capturar.
         * Decide quien llama, con el pago bloqueado; nunca se confirma en silencio.
         */
        COBRADO_SIN_CAPTURAR,
        /** El intent cobró y quedó confirmado por el camino idempotente de captura. */
        CONFIRMADO,
        /** El intent cobró pero ya no se pudo vender (pedido cancelado o sin stock): REEMBOLSO_PENDIENTE. */
        REEMBOLSO_PENDIENTE,
        /** Otra entrega ya lo había capturado. */
        DUPLICADO,
        /** El intent cobró con otro monto, moneda o id: no se confirma ni se cancela (alerta). */
        DATOS_DISTINTOS,
        /** ONVO no respondió, respondió vacío o un estado que todavía puede cobrar: no se toca nada. */
        EN_DUDA
    }

    /** Estados del intent (OpenAPI de ONVO) en los que no hubo cobro. Cualquier otro valor cuenta como en duda. */
    static final java.util.Set<String> INTENT_SIN_COBRO =
        java.util.Set.of("requires_payment_method", "requires_confirmation", "canceled");

    /**
     * Gate fail-closed de TODA cancelación de un pago ONVO en línea (limpieza TTL, cancelación del comprador o del
     * panel, respaldo). Relee por GET la sesión y su payment intent; si la sesión ya no existe (404) usa el intent
     * guardado en el pago (V237). Una sesión inexistente NO prueba que el intent no cobró.
     * <ul>
     *   <li>intent succeeded con monto/moneda/modo/id iguales → captura idempotente existente (confirma, o
     *       REEMBOLSO_PENDIENTE si el pedido ya no se puede vender);</li>
     *   <li>intent sin cobro y sin receivedAmount: {@code canceled}, o requires_payment_method/requires_confirmation
     *       con la sesión expired o inexistente → {@code SIN_COBRO}, lo único que autoriza a cancelar y liberar stock;
     *       con la sesión todavía abierta → {@code SIN_COBRO_SESION_ABIERTA} (solo autoriza a expirar primero);</li>
     *   <li>error, timeout, respuesta vacía, otro id/modo, estado intermedio, o sesión 404 sin intent conocido →
     *       {@code EN_DUDA}: nadie cancela ni libera.</li>
     * </ul>
     * Solo GET: no escribe en ONVO. LÍMITE: el último GET no es atómico contra una captura posterior (ver
     * docs/security/onvo-gate-cancelacion-limite.md); la compensación es el webhook / el respaldo de cerrados, que
     * capturan sobre un pedido cancelado y lo dejan REEMBOLSO_PENDIENTE con aviso al admin.
     */
    public CobroIntent revisarCobroAntesDeCancelar(String checkoutSessionId, String origen) {
        return revisarCobro(checkoutSessionId, origen, true).cobro();
    }

    /**
     * fix2: resultado del gate con el estado del intent leído (null si no se llegó a leer). La conciliación durable lo
     * usa para saber si el pago quedó resuelto sin cobro de forma definitiva (intent {@code canceled}).
     */
    public record RevisionCobro(CobroIntent cobro, String estadoIntent) {
        static RevisionCobro de(CobroIntent c) { return new RevisionCobro(c, null); }
    }

    /**
     * Gate de {@link #revisarCobroAntesDeCancelar}. Con {@code capturar=false} (cancelación explícita del comprador o
     * del panel) un intent cobrado NO pasa por la captura: devuelve {@link CobroIntent#COBRADO_SIN_CAPTURAR} y decide
     * quien llama, en su transacción y con el pago bloqueado (sin abrir una transacción REQUIRES_NEW bajo un lock
     * externo, que se autobloqueaba con el FOR UPDATE del pedido del panel).
     */
    public RevisionCobro revisarCobro(String checkoutSessionId, String origen, boolean capturar) {
        try {
            if (onvoService.isMockMode()) {
                // Modo simulado explícito (perfil dev/test sin llave): no hay sesión ni intent reales. Igual que antes.
                return RevisionCobro.de(CobroIntent.SIN_COBRO);
            }
            if (!onvoService.isPagosDisponibles()) return RevisionCobro.de(CobroIntent.EN_DUDA);
            String guardado = intentGuardado(checkoutSessionId);
            Map<?, ?> sesion = onvoService.obtenerCheckoutSession(checkoutSessionId);
            String intentId;
            // Sesión que todavía se puede pagar: existe y ONVO no la muestra expired.
            boolean sesionAbierta = sesion != null && !sesion.isEmpty()
                && !"expired".equalsIgnoreCase(String.valueOf(sesion.get("status")));
            if (sesion == null || sesion.isEmpty()) {
                // 404 (o id no consultable): solo se puede decidir con un intent conocido de antes.
                if (guardado == null) {
                    log.error("[ALERTA-PAGO] Sesión ONVO inexistente y sin payment intent conocido: no se cancela ni se libera "
                        + "stock; revisión manual. sessionId={}", OnvoService.enmascarar(checkoutSessionId));
                    return RevisionCobro.de(CobroIntent.EN_DUDA);
                }
                intentId = guardado;
            } else {
                intentId = OnvoCobroVerificador.paymentIntentId(sesion);
                if (intentId == null || intentId.isBlank()) {
                    if (guardado != null) {
                        intentId = guardado;
                    } else {
                        // Sin intent no hay cobro posible, salvo que la sesión diga paid (inconsistente: en duda).
                        if ("paid".equalsIgnoreCase(String.valueOf(sesion.get("paymentStatus")))) {
                            return RevisionCobro.de(CobroIntent.EN_DUDA);
                        }
                        return RevisionCobro.de(sesionAbierta ? CobroIntent.SIN_COBRO_SESION_ABIERTA : CobroIntent.SIN_COBRO);
                    }
                } else {
                    recordarIntent(checkoutSessionId, intentId, guardado);
                }
            }
            Map<?, ?> intent = onvoService.obtenerPaymentIntent(intentId);
            String modo = onvoService.modoEsperado();
            if (intent == null || intent.isEmpty() || !intentId.equals(texto(intent, "id"))
                    || modo == null || !modo.equalsIgnoreCase(texto(intent, "mode"))) {
                log.warn("[onvo] Intent sin respuesta clara antes de cancelar: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
                return RevisionCobro.de(CobroIntent.EN_DUDA);
            }
            String estado = texto(intent, "status");
            String estadoNorm = estado == null ? null : estado.toLowerCase(java.util.Locale.ROOT);
            if ("succeeded".equals(estadoNorm)) {
                return new RevisionCobro(capturar
                    ? confirmarIntentCobrado(checkoutSessionId, intentId, intent, origen)
                    : cobradoSinCapturar(checkoutSessionId, intent), estadoNorm);
            }
            if (estadoNorm != null && INTENT_SIN_COBRO.contains(estadoNorm) && sinMontoRecibido(intent)) {
                // canceled es terminal en ONVO. requires_payment_method / requires_confirmation solo cuentan como sin
                // cobro definitivo si la sesión ya no se puede pagar (expired o inexistente).
                boolean terminal = "canceled".equals(estadoNorm) || !sesionAbierta;
                return new RevisionCobro(terminal ? CobroIntent.SIN_COBRO : CobroIntent.SIN_COBRO_SESION_ABIERTA, estadoNorm);
            }
            return new RevisionCobro(CobroIntent.EN_DUDA, estadoNorm);
        } catch (RuntimeException e) {
            log.warn("[onvo] Reconsulta del intent falló: sessionId={} ({})", OnvoService.enmascarar(checkoutSessionId), e.getClass().getSimpleName());
            return RevisionCobro.de(CobroIntent.EN_DUDA);
        }
    }

    /** Intent cobrado sin capturar: mismas verificaciones que la captura (pago ONVO local, monto/moneda/modo/id). */
    private CobroIntent cobradoSinCapturar(String checkoutSessionId, Map<?, ?> intent) {
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())) return CobroIntent.EN_DUDA;
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) return CobroIntent.DUPLICADO;
        if (!OnvoCobroVerificador.coincide(pago, intent)) {
            log.error("[ALERTA-PAGO] {}", OnvoCobroVerificador.mensajeAlerta(pago, intent));
            return CobroIntent.DATOS_DISTINTOS;
        }
        return CobroIntent.COBRADO_SIN_CAPTURAR;
    }

    /** Intent guardado en el pago (V237), o null. */
    private String intentGuardado(String checkoutSessionId) {
        if (pagoRepository == null || checkoutSessionId == null) return null;
        // fix2: se lee la columna de la base (la copia en memoria puede estar vieja: la columna es updatable=false).
        String v = pagoRepository.intentIdEnBase(checkoutSessionId).orElse(null);
        return v == null || v.isBlank() ? null : v;
    }

    /** Best-effort: guardar el intent de la sesión nunca cambia una verificación. */
    private void recordarIntent(String checkoutSessionId, String intentId, String guardado) {
        if (intentId == null || intentId.isBlank() || intentId.equals(guardado) || onvoCapturaService == null) return;
        try {
            onvoCapturaService.guardarIntentId(checkoutSessionId, intentId);
        } catch (RuntimeException e) {
            log.warn("[onvo] No se guardó el payment intent: sessionId={} ({})", OnvoService.enmascarar(checkoutSessionId), e.getClass().getSimpleName());
        }
    }

    private CobroIntent confirmarIntentCobrado(String checkoutSessionId, String intentId, Map<?, ?> intent, String origen) {
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())) return CobroIntent.EN_DUDA;
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) return CobroIntent.DUPLICADO;
        if (!OnvoCobroVerificador.coincide(pago, intent)) {
            log.error("[ALERTA-PAGO] {}", OnvoCobroVerificador.mensajeAlerta(pago, intent));
            return CobroIntent.DATOS_DISTINTOS;
        }
        log.error("[ALERTA-PAGO] Intent succeeded con la sesión sin marcar pagada: se confirma por la captura idempotente. sessionId={}",
            OnvoService.enmascarar(checkoutSessionId));
        OnvoCapturaService.Captura captura = capturar(checkoutSessionId, intentId, origen);
        if (captura == OnvoCapturaService.Captura.CAPTURADO) guardarSinpeRef(checkoutSessionId, intentId);
        return switch (captura) {
            case CAPTURADO -> CobroIntent.CONFIRMADO;
            case DUPLICADO -> CobroIntent.DUPLICADO;
            case COBRADO_SOBRE_CANCELADO, COBRADO_SOBREVENTA -> CobroIntent.REEMBOLSO_PENDIENTE;
        };
    }

    /** receivedAmount ausente o 0: ONVO no recibió plata. Cualquier monto recibido deja el caso en duda. */
    private static boolean sinMontoRecibido(Map<?, ?> intent) {
        Object r = intent.get("receivedAmount");
        if (r == null) return true;
        try {
            return new java.math.BigDecimal(String.valueOf(r)).signum() == 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private static String texto(Map<?, ?> m, String campo) {
        Object v = m == null ? null : m.get(campo);
        return v == null ? null : String.valueOf(v);
    }

    /**
     * Webhook {@code payment-intent.succeeded} de una venta en línea (checkout hospedado). El cuerpo solo da el id:
     * se relee el intent por GET, se busca el pedido por {@code metadata.pedidoId} del intent (pista, no prueba),
     * se exige que la sesión del pago apunte a ese mismo intent y la confirmación sale de
     * {@link #procesarPagoVerificado} (dedupe por sesión + lock de la fila). Si la sesión todavía no figura pagada
     * pero el intent sí, se usa {@link #revisarCobroAntesDeCancelar}. {@code NO_ENCONTRADO} = no es venta en línea.
     */
    public Verificacion procesarIntentVentaOnline(String intentId, String origen) {
        if (intentId == null || intentId.isBlank()) return Verificacion.NO_ENCONTRADO;
        if (!onvoService.isPagosDisponibles()) return Verificacion.NO_CONSULTABLE;
        Map<?, ?> intent;
        Map<?, ?> sesion;
        Pago pago;
        try {
            intent = onvoService.obtenerPaymentIntent(intentId);
            if (intent == null || intent.isEmpty()) return Verificacion.NO_ENCONTRADO;
            // Primero el intent ya visto en la sesión del pago (V237); si no, metadata.pedidoId como pista.
            pago = pagoRepository.findFirstByOnvoPaymentIntentId(intentId).orElse(null);
            if (pago == null) {
                Long pedidoId = pedidoIdDeMetadata(intent);
                if (pedidoId == null) return Verificacion.NO_ENCONTRADO;
                pago = pagoRepository.findTopByPedidoId(pedidoId).orElse(null);
            }
            if (pago == null || pago.getMerchantToken() == null
                    || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())) {
                return Verificacion.NO_ENCONTRADO;
            }
            if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())
                    || com.hotclick.service.payment.PaymentOrderConfirmationService.enReembolso(pago.getEstadoPago())) {
                return Verificacion.DUPLICADO;
            }
            sesion = onvoService.obtenerCheckoutSession(pago.getMerchantToken());
        } catch (RuntimeException e) {
            log.warn("[onvo] payment-intent.succeeded sin respuesta de ONVO: intent={} ({})", OnvoService.enmascarar(intentId), e.getClass().getSimpleName());
            return Verificacion.NO_CONSULTABLE;
        }
        boolean sesionInexistente = sesion == null || sesion.isEmpty();
        boolean mismoIntent = sesionInexistente
            ? intentId.equals(pago.getOnvoPaymentIntentId())
            : intentId.equals(OnvoCobroVerificador.paymentIntentId(sesion));
        if (!mismoIntent) {
            log.warn("[onvo] payment-intent.succeeded: la sesión del pedido no apunta a ese intent: intent={}", OnvoService.enmascarar(intentId));
            return Verificacion.NO_ENCONTRADO;
        }
        String sessionId = pago.getMerchantToken();
        Verificacion v = sesionInexistente ? Verificacion.NO_ENCONTRADO : procesarPagoVerificado(sessionId, origen);
        if (v != Verificacion.NO_PAGADO && v != Verificacion.NO_ENCONTRADO) return v;
        // Sesión sin marcar pagada o ya inexistente (404): decide el intent (guardado si hace falta).
        return switch (revisarCobroAntesDeCancelar(sessionId, origen)) {
            case CONFIRMADO -> Verificacion.OK;
            case DUPLICADO -> Verificacion.DUPLICADO;
            case REEMBOLSO_PENDIENTE -> Verificacion.COBRADO_SOBREVENTA;
            case DATOS_DISTINTOS -> Verificacion.DATOS_DISTINTOS;
            case EN_DUDA, COBRADO_SIN_CAPTURAR -> Verificacion.EN_PROCESO;
            case SIN_COBRO, SIN_COBRO_SESION_ABIERTA -> Verificacion.NO_PAGADO;
        };
    }

    private static Long pedidoIdDeMetadata(Map<?, ?> intent) {
        if (!(intent.get("metadata") instanceof Map<?, ?> md)) return null;
        Object v = md.get("pedidoId");
        if (v == null) return null;
        try {
            long id = Long.parseLong(String.valueOf(v).trim());
            return id > 0 ? id : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * C6: si dos entregas chocan en el UNIQUE (sessionId, evento), la otra ya capturó: DUPLICADO, no 500
     * (un 500 haría que ONVO reintente sin sentido).
     */
    OnvoCapturaService.Captura capturar(String checkoutSessionId, String intentId, String origen) {
        try {
            return onvoCapturaService.capturarVerificado(checkoutSessionId,
                "{\"verificado\":\"GET ONVO\",\"paymentIntentId\":\"" + intentId + "\"}", origen);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.info("[onvo] Entrega concurrente ya registrada: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
            return OnvoCapturaService.Captura.DUPLICADO;
        }
    }

    /** Best-effort: el pago ya quedó confirmado; un fallo aquí nunca cambia la verificación. */
    private void guardarSinpeRef(String checkoutSessionId, String intentId) {
        try {
            String ref = onvoService.sinpeRefNumberDe(intentId);
            if (ref != null) onvoCapturaService.guardarSinpeRef(checkoutSessionId, ref);
        } catch (RuntimeException e) {
            log.warn("[onvo] No se guardó SINPERefNumber: sessionId={} ({})", OnvoService.enmascarar(checkoutSessionId), e.getClass().getSimpleName());
        }
    }

    /**
     * Antes de cancelar por expiración: expira la sesión en ONVO para que ya no se pueda pagar.
     * true solo si ONVO confirma que quedó expirada y sin cobro, o si ONVO no tiene la sesión (404).
     * Si ONVO no responde, se relanza y la limpieza no cancela.
     */
    public boolean expirarSesionSinCobro(String checkoutSessionId) {
        // Limpieza TTL y rechazo (revisado en BAJO QA7-B1 a): llegan acá después de que ONVO confirmó por GET que
        // no hay cobro (NO_PAGADO / intent rechazado), y en mock las sesiones no tienen forma de ONVO; por eso
        // aquí una respuesta vacía sigue contando como sin cobro. La cancelación usa expirarSesionParaCancelar.
        // La sesión que ONVO ya expiró solo no se vuelve a expirar: /expire responde 400 y el pago quedaba
        // PENDIENTE para siempre con la reserva tomada.
        if (yaExpiradaSinPagar(checkoutSessionId)) {
            return true;
        }
        Map<?, ?> sesion;
        try {
            sesion = onvoService.expirarCheckoutSession(checkoutSessionId);
        } catch (org.springframework.web.client.HttpClientErrorException.BadRequest e) {
            // Fail-closed: solo se cancela si al releerla ONVO la muestra expirada y sin pagar.
            boolean ok = yaExpiradaSinPagar(checkoutSessionId);
            if (!ok) log.warn("[onvo] Expire respondió 400 y la sesión no está expirada y sin pagar: no se cancela");
            return ok;
        }
        if (sesion.isEmpty()) {
            return true;
        }
        return sesionExpiradaSinCobro(sesion, checkoutSessionId);
    }

    /** GET de la sesión: true solo con status expired y paymentStatus unpaid explícitos. Los errores se relanzan. */
    private boolean yaExpiradaSinPagar(String checkoutSessionId) {
        Map<?, ?> sesion = onvoService.obtenerCheckoutSession(checkoutSessionId);
        return sesion != null
            && "expired".equalsIgnoreCase(String.valueOf(sesion.get("status")))
            && "unpaid".equalsIgnoreCase(String.valueOf(sesion.get("paymentStatus")));
    }

    /**
     * BAJO QA7-B1 (a), camino de cancelación del comprador: true solo si ONVO confirma expirada y sin cobro,
     * o con un 404 explícito. Un 2xx sin cuerpo o un id no consultable NO cuentan como sin cobro (fail-closed).
     */
    public boolean expirarSesionParaCancelar(String checkoutSessionId) {
        OnvoService.ResultadoExpirar r = onvoService.expirarCheckoutSessionTipado(checkoutSessionId);
        return switch (r.tipo()) {
            case NO_EXISTE -> true;
            case RESPUESTA -> sesionExpiradaSinCobro(r.sesion(), checkoutSessionId);
            case SIN_CUERPO, NO_CONSULTABLE -> {
                log.warn("[onvo] Expire sin confirmación ({}): no se cancela sessionId={}", r.tipo(), OnvoService.enmascarar(checkoutSessionId));
                yield false;
            }
        };
    }

    private boolean sesionExpiradaSinCobro(Map<?, ?> sesion, String checkoutSessionId) {
        boolean expirada = "expired".equalsIgnoreCase(String.valueOf(sesion.get("status")));
        boolean pagada = "paid".equalsIgnoreCase(String.valueOf(sesion.get("paymentStatus")));
        if (!expirada || pagada) {
            log.warn("[onvo] ONVO no dejó la sesión expirada y sin cobro: sessionId={}", OnvoService.enmascarar(checkoutSessionId));
            return false;
        }
        return true;
    }

    /**
     * payment-intent.failed: solo se registra (una vez por intent) si ONVO confirma el fallo por GET.
     * No cancela ni marca fallido: en el checkout hospedado el comprador puede reintentar en la
     * misma sesión. El cierre lo hace la expiración, que antes reconsulta a ONVO.
     */
    public boolean registrarIntentFallido(String intentId, String origen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(intentId, EVENTO_INTENT_FALLIDO)) {
            return false;
        }
        Map<?, ?> intent = onvoService.obtenerPaymentIntent(intentId);
        if (!"failed".equalsIgnoreCase(String.valueOf(intent.get("status")))) {
            log.warn("[onvo] payment-intent.failed no confirmado por ONVO: intent={}", intentId);
            return false;
        }
        onvoCapturaService.registrar(intentId, EVENTO_INTENT_FALLIDO, "{\"verificado\":\"GET ONVO\"}", origen);
        log.warn("[onvo] Intento de cobro rechazado por ONVO: intent={}", intentId);
        return true;
    }
}
