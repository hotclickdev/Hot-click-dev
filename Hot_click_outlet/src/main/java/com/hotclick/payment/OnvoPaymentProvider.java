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
