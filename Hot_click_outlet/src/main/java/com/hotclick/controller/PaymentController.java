package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import jakarta.validation.Valid;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.PagosNoDisponiblesException;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.TilopayService;
import java.util.Locale;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.TilopayConfirmacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private TilopayConfirmacionService tilopayConfirmacionService;

    @Autowired
    private TilopayService tilopayService;

    @Autowired
    private RateLimiter rateLimiter;

    /** Tope por correo del checkout invitado (el filtro ya limita por IP). */
    static final int GUEST_EMAIL_MAX = 5;
    static final int GUEST_EMAIL_VENTANA_S = 600;

    /** Público: el front avisa antes de crear el pedido si la pasarela no tiene credenciales. */
    @GetMapping("/disponibilidad")
    public ResponseEntity<ResponseDTO> disponibilidad() {
        return ResponseEntity.ok(ResponseDTO.success("Disponibilidad de pagos",
            Map.of("tilopay", tilopayService.isPagosDisponibles())));
    }

    @PostMapping("/checkout")
    public ResponseEntity<ResponseDTO> checkout(@Valid @RequestBody PaymentCheckoutRequest request) {
        try {
            String correoUsuario = SecurityContextHolder.getContext().getAuthentication().getName();
            PaymentCheckoutResponse response = paymentService.checkout(request, correoUsuario);
            return ResponseEntity.ok(ResponseDTO.success("Sesión de pago creada", response));
        } catch (PagosNoDisponiblesException e) {
            return ResponseEntity.status(503).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/status/{numeroPedido}")
    public ResponseEntity<ResponseDTO> consultarEstado(@PathVariable String numeroPedido) {
        try {
            PaymentStatusResponse response = paymentService.consultarEstado(numeroPedido);
            return ResponseEntity.ok(ResponseDTO.success("Estado del pago", response));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/cancel/{numeroPedido}")
    public ResponseEntity<ResponseDTO> cancelarPedido(@PathVariable String numeroPedido) {
        try {
            String correoUsuario = SecurityContextHolder.getContext().getAuthentication().getName();
            paymentService.cancelarPorUsuario(numeroPedido, correoUsuario);
            return ResponseEntity.ok(ResponseDTO.success("Pedido cancelado", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/guest-checkout")
    public ResponseEntity<ResponseDTO> guestCheckout(@Valid @RequestBody PaymentCheckoutRequest request) {
        try {
            String correo = request.getGuestEmail() == null ? "" : request.getGuestEmail().trim().toLowerCase(Locale.ROOT);
            if (!correo.isEmpty() && !rateLimiter.tryAcquire("guest-checkout:email:" + correo, GUEST_EMAIL_MAX, GUEST_EMAIL_VENTANA_S)) {
                return ResponseEntity.status(429).body(ResponseDTO.error(
                    "Demasiados intentos. Esperá un momento antes de volver a intentar."));
            }
            PaymentCheckoutResponse response = paymentService.checkout(request, null);
            return ResponseEntity.ok(ResponseDTO.success("Sesión de pago creada", response));
        } catch (PagosNoDisponiblesException e) {
            return ResponseEntity.status(503).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/guest/cancel/{numeroPedido}")
    public ResponseEntity<ResponseDTO> guestCancelarPedido(
            @PathVariable String numeroPedido,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String cancelToken = body != null ? body.get("cancelToken") : null;
            paymentService.cancelarAnon(numeroPedido, cancelToken);
            return ResponseEntity.ok(ResponseDTO.success("Pedido cancelado", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/tilopay/confirmar/{numeroPedido}")
    public ResponseEntity<ResponseDTO> confirmarTilopay(
            @PathVariable String numeroPedido,
            @RequestBody(required = false) Map<String, String> queryParams) {
        try {
            PaymentStatusResponse response = tilopayConfirmacionService.confirmar(
                numeroPedido, queryParams != null ? queryParams : Map.of());
            return ResponseEntity.ok(ResponseDTO.success("Confirmación Tilopay", response));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/tilopay/reintentar/{numeroPedido}")
    public ResponseEntity<ResponseDTO> reintentarTilopay(@PathVariable String numeroPedido) {
        try {
            var session = tilopayConfirmacionService.reintentar(numeroPedido);
            return ResponseEntity.ok(ResponseDTO.success("Reintento Tilopay", Map.of(
                "orderNumber", session.externalId(),
                "sdkToken", session.sdkToken() != null ? session.sdkToken() : "",
                "redirectUrl", session.redirectUrl() != null ? session.redirectUrl() : "",
                "modoEmbebido", session.modoEmbebido()
            )));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
