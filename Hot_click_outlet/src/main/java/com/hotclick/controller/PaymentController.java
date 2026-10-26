package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import jakarta.validation.Valid;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.dto.ResponseDTO;
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
    private com.hotclick.repository.ProductoRepository productoRepository;

    @Autowired
    private TilopayConfirmacionService tilopayConfirmacionService;

    @Autowired
    private com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard;

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody PaymentCheckoutRequest request) {
        if (hayTiendaPausada(request)) {
            return ResponseEntity.status(409).body(java.util.Map.of(
                "success", false, "code", "TIENDA_PAUSADA",
                "message", "Esta tienda está pausada por ahora. No se puede comprar."));
        }
        try {
            com.hotclick.service.envio.ContraEntregaPolitica.validarCheckout(request);
            String correoUsuario = SecurityContextHolder.getContext().getAuthentication().getName();
            PaymentCheckoutResponse response = paymentService.checkout(request, correoUsuario);
            return ResponseEntity.ok(ResponseDTO.success("Sesión de pago creada", response));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
        }
    }

    private static final int MAX_ITEMS_PAUSA = 200;

    /** Pausa de tienda: ningún producto de una tienda pausada se puede comprar (409 TIENDA_PAUSADA). */
    private boolean hayTiendaPausada(PaymentCheckoutRequest request) {
        if (request.getItems() == null) return false;
        var ids = request.getItems().stream()
            .filter(i -> i != null && i.getProductoId() != null)
            .map(PaymentCheckoutRequest.ItemDTO::getProductoId)
            .limit(MAX_ITEMS_PAUSA)
            .collect(java.util.stream.Collectors.toSet());
        return !ids.isEmpty() && productoRepository.contarDeTiendasPausadas(ids) > 0;
    }

    @GetMapping("/status/{numeroPedido}")
    public ResponseEntity<ResponseDTO> consultarEstado(@PathVariable String numeroPedido) {
        try {
            PaymentStatusResponse response = paymentService.consultarEstado(numeroPedido);
            return ResponseEntity.ok(ResponseDTO.success("Estado del pago", response));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
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
            return ResponseEntity.internalServerError().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @PostMapping("/guest-checkout")
    public ResponseEntity<ResponseDTO> guestCheckout(@Valid @RequestBody PaymentCheckoutRequest request,
                                                     jakarta.servlet.http.HttpServletRequest http) {
        return guestCheckoutGuard.ejecutar(request, http, () -> guestCheckoutSinGuard(request));
    }

    private ResponseEntity<ResponseDTO> guestCheckoutSinGuard(PaymentCheckoutRequest request) {
        try {
            PaymentCheckoutResponse response = paymentService.checkout(request, null);
            return ResponseEntity.ok(ResponseDTO.success("Sesión de pago creada", response));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
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
            return ResponseEntity.internalServerError().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
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
            return ResponseEntity.internalServerError().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @PostMapping("/tilopay/reintentar/{numeroPedido}")
    public ResponseEntity<ResponseDTO> reintentarTilopay(
            @PathVariable String numeroPedido,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            // v2: reintentoToken (propósito REINTENTAR). cancelToken solo sirve si es v1 dentro de la ventana de compatibilidad.
            String cancelToken = body == null ? null
                : body.getOrDefault("reintentoToken", body.get("cancelToken"));
            var session = tilopayConfirmacionService.reintentar(numeroPedido, correoAutenticado(), cancelToken);
            // H-07: endpoint permitAll; el sdkToken no se expone (cualquiera con el numero de pedido lo obtendria).
            return ResponseEntity.ok(ResponseDTO.success("Reintento Tilopay", Map.of(
                "orderNumber", session.externalId(),
                "redirectUrl", session.redirectUrl() != null ? session.redirectUrl() : "",
                "modoEmbebido", session.modoEmbebido()
            )));
        } catch (com.hotclick.exception.RecursoNoEncontradoException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Pedido no encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    /** Correo del usuario autenticado, o null si es anónimo. */
    private static String correoAutenticado() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return null;
        }
        return auth.getName();
    }
}
