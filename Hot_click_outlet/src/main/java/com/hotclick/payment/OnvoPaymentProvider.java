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
    public enum Verificacion { OK, DUPLICADO, NO_PAGADO, NO_ENCONTRADO, DATOS_DISTINTOS }

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired private OnvoService            onvoService;
    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private OnvoCapturaService     onvoCapturaService;

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
        String successUrl  = appUrl + "/pago/exito?order=" + pedido.getNumeroPedido();
        String cancelUrl   = appUrl + "/pago/cancelado?order=" + pedido.getNumeroPedido();

        Map<String, String> metadata = Map.of(
            "pedidoId",     String.valueOf(pedido.getId()),
            "numeroPedido", pedido.getNumeroPedido()
        );

        OnvoService.OnvoCheckoutSession session = onvoService.crearCheckoutSession(
            pedido.getTotalPedido(), descripcion, successUrl, cancelUrl,
            usuario.getCorreo(), metadata);

        log.info("[onvo] Checkout session creada: {} pedido={}", session.id(), pedido.getNumeroPedido());

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
            log.info("[onvo] Sesión ya procesada: sessionId={}", checkoutSessionId);
            return Verificacion.DUPLICADO;
        }
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || pago.getPedido() == null
                || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())) {
            log.warn("[onvo] Sesión sin pago ONVO local: sessionId={}", checkoutSessionId);
            return Verificacion.NO_ENCONTRADO;
        }
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return Verificacion.DUPLICADO;
        }
        Map<?, ?> sesion = onvoService.obtenerCheckoutSession(checkoutSessionId);
        if (sesion.isEmpty()) {
            return Verificacion.NO_ENCONTRADO;
        }
        String intentId = OnvoCobroVerificador.paymentIntentId(sesion);
        Map<?, ?> intent = onvoService.obtenerPaymentIntent(intentId);
        switch (OnvoCobroVerificador.decidir(pago, sesion, intent)) {
            case ACEPTAR -> {
                boolean capturado = onvoCapturaService.capturarVerificado(checkoutSessionId,
                    "{\"verificado\":\"GET ONVO\",\"paymentIntentId\":\"" + intentId + "\"}", origen);
                return capturado ? Verificacion.OK : Verificacion.DUPLICADO;
            }
            case RECHAZAR_MONTO -> {
                log.error("[ALERTA-PAGO] {}", OnvoCobroVerificador.mensajeAlerta(pago, intent));
                return Verificacion.DATOS_DISTINTOS;
            }
            default -> {
                // Sin transacción el pedido es un proxy lazy: se loguea la sesión, no el número de pedido.
                log.info("[onvo] Sesión todavía sin cobro confirmado: sessionId={}", checkoutSessionId);
                return Verificacion.NO_PAGADO;
            }
        }
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
