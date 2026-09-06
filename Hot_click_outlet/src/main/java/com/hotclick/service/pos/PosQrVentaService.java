package com.hotclick.service.pos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.OnvoSinpeSupport;
import com.hotclick.service.StripeService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class PosQrVentaService {

    private static final Logger log = LoggerFactory.getLogger(PosQrVentaService.class);

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired private StripeService         stripeService;
    @Autowired private OnvoService           onvoService;
    @Autowired private PosQrSessionService   sessionService;
    @Autowired private PosQrVentaCompletionService completionService;
    @Autowired private TurnoCajaService       turnoCajaService;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Value("${onvo.sinpe-destino:+50670196686}")
    private String onvoSinpeDestino;

    /**
     * Crea el checkout de tarjeta (ONVO, igual que la tienda).
     * La ruta HTTP sigue llamándose /stripe por compatibilidad con el front.
     */
    @Transactional
    public String crearStripeCheckout(String token) {
        PosQrSesion sesion = sessionService.findSesionActiva(token);
        exigirMetodoPasarela(sesion);
        if (onvoService.isMockMode()) {
            throw new IllegalStateException(
                "ONVO no está configurado. Añade ONVO_SECRET_KEY para cobrar con tarjeta en el POS.");
        }

        String successUrl = appUrl + "/pos/pago/" + token + "?resultado=exito";
        String cancelUrl  = appUrl + "/pos/pago/" + token + "?resultado=cancelado";
        Long empresaId = empresaIdDe(sesion);

        try {
            List<Map<String, Object>> items = sessionService.getMapper().readValue(
                sesion.getItemsJson(), new TypeReference<>() {});
            String descripcion = descripcionCheckout(items);

            OnvoService.OnvoCheckoutSession checkout = onvoService.crearCheckoutSession(
                sesion.getTotal(), descripcion, successUrl, cancelUrl, correoCheckout(sesion),
                Map.of(
                    "pos_qr_token", token,
                    "origen", "POS",
                    "empresa_id", String.valueOf(empresaId)
                ));

            sesion.setStripeSessionId(checkout.id());
            posQrRepo.save(sesion);
            return checkout.url();
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("[POS-QR] Error creando checkout ONVO para token={}: {}", token, e.getMessage());
            throw new IntegracionExternaException("onvo", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al crear sesión de pago: " + e.getMessage(), e);
        }
    }

    /**
     * Crea payment intent ONVO para pago embebido (SDK) en la página del QR.
     */
    @Transactional
    public Map<String, String> crearPaymentIntent(String token) {
        PosQrSesion sesion = sessionService.findSesionActiva(token);
        exigirMetodoPasarela(sesion);
        if (onvoService.isMockMode()) {
            throw new IllegalStateException(
                "ONVO no está configurado. Añade ONVO_SECRET_KEY para cobrar con tarjeta en el POS.");
        }
        String publishableKey = onvoService.getPublishableKey();
        if (publishableKey == null || publishableKey.isBlank()) {
            throw new IllegalStateException(
                "ONVO_PUBLISHABLE_KEY no configurado para pago embebido en POS.");
        }
        String intentExistente = sesion.getStripeSessionId();
        if (intentExistente != null && !intentExistente.isBlank()) {
            return Map.of(
                "paymentIntentId", intentExistente,
                "publishableKey", publishableKey
            );
        }
        String intentId = asegurarPaymentIntent(sesion);
        return Map.of("paymentIntentId", intentId, "publishableKey", publishableKey);
    }

    /**
     * Confirma el payment intent ONVO con un método SINPE Móvil.
     * El pedido se cierra con el webhook payment-intent.succeeded.
     */
    @Transactional
    public Map<String, String> iniciarSinpeOnvo(String token, String telefono, String cedula,
                                               String nombre, String email) {
        PosQrSesion sesion = sessionService.findSesionActiva(token);
        if (!"SINPE".equals(sesion.getMetodoPago())) {
            throw new IllegalStateException("Esta sesión no es de SINPE");
        }
        if ("PAGADO".equals(sesion.getEstado())) {
            return respuestaSinpeOnvo("PAGADO", sesion.getStripeSessionId());
        }
        String intentId = asegurarPaymentIntent(sesion);
        if (onvoService.paymentIntentPagado(intentId)) {
            return respuestaSinpeOnvo("PROCESSING", intentId);
        }
        String correo = (email == null || email.isBlank()) ? correoCheckout(sesion) : email.trim();
        OnvoService.OnvoPaymentMethod metodo = onvoService.crearMetodoPagoSinpe(
            OnvoSinpeSupport.cedula(cedula),
            OnvoSinpeSupport.telefonoE164(telefono),
            OnvoSinpeSupport.nombre(nombre),
            correo);
        onvoService.confirmarPaymentIntent(intentId, metodo.id());
        return respuestaSinpeOnvo("PROCESSING", intentId);
    }

    private String asegurarPaymentIntent(PosQrSesion sesion) {
        if (onvoService.isMockMode()) {
            throw new IllegalStateException(
                "ONVO no está configurado. Añade ONVO_SECRET_KEY para cobrar en el POS.");
        }
        if (sesion.getStripeSessionId() != null && !sesion.getStripeSessionId().isBlank()) {
            return sesion.getStripeSessionId();
        }
        try {
            List<Map<String, Object>> items = sessionService.getMapper().readValue(
                sesion.getItemsJson(), new TypeReference<>() {});
            String descripcion = descripcionCheckout(items);
            Long empresaId = empresaIdDe(sesion);
            OnvoService.OnvoPaymentIntent intent = onvoService.crearPaymentIntent(
                sesion.getTotal(), descripcion,
                Map.of(
                    "pos_qr_token", sesion.getToken(),
                    "origen", "POS",
                    "empresa_id", String.valueOf(empresaId)
                ));
            sesion.setStripeSessionId(intent.id());
            posQrRepo.save(sesion);
            return intent.id();
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("[POS-QR] Error creando payment intent token={}: {}", sesion.getToken(), e.getMessage());
            throw new IntegracionExternaException("onvo", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al crear intención de pago: " + e.getMessage(), e);
        }
    }

    @Transactional
    public boolean completarSiPagoPasarela(String pasarelaSessionId) {
        if (pasarelaSessionId == null || pasarelaSessionId.isBlank()) return false;
        PosQrSesion sesion = posQrRepo.findByStripeSessionId(pasarelaSessionId).orElse(null);
        if (sesion == null) return false;
        if ("PAGADO".equals(sesion.getEstado())) return true;
        if (!"PENDIENTE".equals(sesion.getEstado())) {
            log.warn("[POS-QR] Checkout {} en estado {}, no se completa", pasarelaSessionId, sesion.getEstado());
            return true;
        }
        // Ya vinculado a un pedido de tienda: no crear segundo pedido POS.
        if (sesion.getPedidoId() != null) {
            marcarPagadoSinPedidoPos(sesion);
            return true;
        }
        completionService.completarVentaTarjeta(sesion);
        return true;
    }

    /**
     * Al iniciar checkout de la tienda con el token del QR, guarda el pedido
     * sin marcar PAGADO todavía (eso ocurre al confirmar el pago).
     */
    @Transactional
    public void vincularPedidoTienda(String posQrToken, Long pedidoId) {
        if (posQrToken == null || posQrToken.isBlank() || pedidoId == null) return;
        PosQrSesion sesion = posQrRepo.findByToken(posQrToken).orElse(null);
        if (sesion == null) {
            log.warn("[POS-QR] Token {} no encontrado al vincular pedido {}", posQrToken, pedidoId);
            return;
        }
        if (!"PENDIENTE".equals(sesion.getEstado())) {
            log.warn("[POS-QR] Sesión {} en estado {}, no se vincula pedido", posQrToken, sesion.getEstado());
            return;
        }
        sesion.setPedidoId(pedidoId);
        posQrRepo.save(sesion);
        log.info("[POS-QR] Sesión {} vinculada a pedido tienda {}", posQrToken, pedidoId);
    }

    /**
     * Cuando el pago de la tienda confirma el pedido, avisa al cajero.
     * No crea un segundo pedido POS (el ORD-… ya descontó stock).
     */
    @Transactional
    public void marcarPagadoPorPedidoTienda(Long pedidoId) {
        if (pedidoId == null) return;
        PosQrSesion sesion = posQrRepo.findByPedidoId(pedidoId).orElse(null);
        if (sesion == null) return;
        if ("PAGADO".equals(sesion.getEstado())) return;
        if (!"PENDIENTE".equals(sesion.getEstado())) return;
        marcarPagadoSinPedidoPos(sesion);
    }

    private void marcarPagadoSinPedidoPos(PosQrSesion sesion) {
        sesion.setEstado("PAGADO");
        posQrRepo.save(sesion);
        if (sesion.getTurno() != null) {
            try {
                turnoCajaService.actualizarTotales(
                    sesion.getTurno().getId(), sesion.getMetodoPago(), sesion.getTotal());
            } catch (Exception e) {
                log.warn("[POS-QR] No se pudo actualizar turno al marcar PAGADO: {}", e.getMessage());
            }
        }
        log.info("[POS-QR] Sesión {} marcada PAGADO vía pedido tienda {}", sesion.getToken(), sesion.getPedidoId());
    }

    @Transactional
    public String verificarEstado(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if ("PAGADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())) {
            return sesion.getEstado();
        }

        if (LocalDateTime.now(Constants.ZONA_CR).isAfter(sesion.getFechaExpiracion())) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            return "EXPIRADO";
        }

        if (pagoPasarelaConfirmado(sesion)) {
            completionService.completarVentaTarjeta(sesion);
            return "PAGADO";
        }

        return sesion.getEstado();
    }

    @Transactional
    public Map<String, Object> consultarEstado(String token) {
        String estado = verificarEstado(token);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("estado", estado);
        posQrRepo.findByToken(token).ifPresent(s -> {
            if (s.getPedidoId() != null) body.put("pedidoId", s.getPedidoId());
        });
        return body;
    }

    private Map<String, String> respuestaSinpeOnvo(String estado, String intentId) {
        String destino = (onvoSinpeDestino == null || onvoSinpeDestino.isBlank())
            ? "+50670196686" : onvoSinpeDestino;
        if (intentId == null || intentId.isBlank()) {
            return Map.of("estado", estado, "destino", destino);
        }
        return Map.of("estado", estado, "destino", destino, "paymentIntentId", intentId);
    }

    private boolean pagoPasarelaConfirmado(PosQrSesion sesion) {
        if (sesion == null || !esMetodoPasarela(sesion)) return false;
        String pasarelaId = sesion.getStripeSessionId();
        if (pasarelaId == null) return false;
        try {
            if (pasarelaId.startsWith("cs_")) {
                return stripeService.checkoutSessionPagada(pasarelaId);
            }
            return "succeeded".equalsIgnoreCase(onvoService.paymentIntentStatus(pasarelaId));
        } catch (Exception e) {
            log.warn("[POS-QR] Error verificando pasarela {}: {}", pasarelaId, e.getMessage());
            return false;
        }
    }

    @Transactional
    public PosQrSesion confirmarSinpe(String token, Long usuarioId, Long empresaId, String notas) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if (!"PENDIENTE".equals(sesion.getEstado())) {
            throw new IllegalStateException("La sesión no está pendiente (estado: " + sesion.getEstado() + ")");
        }
        if (!empresaIdDe(sesion).equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }

        completionService.completarVentaSinpe(sesion, usuarioId, notas);
        return sesion;
    }

    @Transactional
    protected void completarVentaTarjeta(PosQrSesion sesion) {
        completionService.completarVentaTarjeta(sesion);
    }

    @Transactional
    protected void completarVentaSinpe(PosQrSesion sesion, Long usuarioId, String notas) {
        completionService.completarVentaSinpe(sesion, usuarioId, notas);
    }

    static boolean esMetodoPasarela(PosQrSesion sesion) {
        String metodo = sesion == null ? null : sesion.getMetodoPago();
        return "TARJETA".equals(metodo) || "SINPE".equals(metodo);
    }

    static void exigirMetodoPasarela(PosQrSesion sesion) {
        if (sesion == null || !esMetodoPasarela(sesion)) {
            throw new IllegalStateException("Esta sesión no es de pago con pasarela");
        }
    }

    static Long empresaIdDe(PosQrSesion sesion) {
        if (sesion == null) {
            throw new IllegalStateException("La sesión POS no tiene empresa");
        }
        var empresa = sesion.getEmpresa();
        if (empresa == null || empresa.getId() == null) {
            throw new IllegalStateException("La sesión POS no tiene empresa");
        }
        return empresa.getId();
    }

    static String correoCheckout(PosQrSesion sesion) {
        if (sesion.getEmpresa() == null) return null;
        String correo = sesion.getEmpresa().getCorreoEmpresa();
        return correo == null || correo.isBlank() ? null : correo;
    }

    static String descripcionCheckout(List<Map<String, Object>> items) {
        String texto = items.stream()
            .map(i -> i.getOrDefault("nombre", "Producto") + " x" + i.getOrDefault("cantidad", 1))
            .reduce((a, b) -> a + ", " + b)
            .orElse("Compra POS");
        return texto.length() <= 100 ? texto : texto.substring(0, 100);
    }
}
