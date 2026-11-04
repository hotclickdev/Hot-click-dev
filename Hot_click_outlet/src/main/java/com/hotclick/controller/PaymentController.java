package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import jakarta.validation.Valid;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.PaymentService;
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
    private com.hotclick.service.payment.PagoEstadoConsultaService pagoEstadoConsultaService;

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
        } catch (com.hotclick.exception.RecursoNoEncontradoException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.EnvioNoDisponibleException e) {
            throw e; // BAJO #448: GlobalExceptionHandler responde 503 genérico, no 500.
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
    public ResponseEntity<ResponseDTO> consultarEstado(@PathVariable String numeroPedido,
            @RequestHeader(value = "X-Pedido-Token", required = false) String tokenPedido) {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            String correo = auth != null ? auth.getName() : null;
            PaymentStatusResponse response = pagoEstadoConsultaService.consultar(numeroPedido, correo, tokenPedido);
            return ResponseEntity.ok(ResponseDTO.success("Estado del pago", response));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @PostMapping("/cancel/{numeroPedido}")
    public ResponseEntity<ResponseDTO> cancelarPedido(@PathVariable String numeroPedido) {
        return ejecutarCancelacion(() -> paymentService.cancelarPorUsuario(numeroPedido,
                SecurityContextHolder.getContext().getAuthentication().getName()));
    }

    /** Acción de cancelación que puede lanzar excepciones de dominio. */
    @FunctionalInterface
    interface AccionCancelacion {
        void ejecutar() throws Exception;
    }

    /**
     * QA5 ALTO: mapeo único de errores de cancelación (usuario e invitado).
     * 403 SecurityException, 404 inexistente, 409 conflicto de estado o error inesperado; nunca 500.
     */
    static ResponseEntity<ResponseDTO> ejecutarCancelacion(AccionCancelacion accion) {
        try {
            accion.ejecutar();
            return ResponseEntity.ok(ResponseDTO.success("Pedido cancelado", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.RecursoNoEncontradoException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PaymentController.class).warn("[cancel] {}", e.getClass().getSimpleName());
            return ResponseEntity.status(409).body(ResponseDTO.error("No se pudo cancelar el pedido."));
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
        } catch (com.hotclick.exception.RecursoNoEncontradoException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.EnvioNoDisponibleException e) {
            throw e; // BAJO #448: GlobalExceptionHandler responde 503 genérico, no 500.
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
        }
    }

    @PostMapping("/guest/cancel/{numeroPedido}")
    public ResponseEntity<ResponseDTO> guestCancelarPedido(
            @PathVariable String numeroPedido,
            @RequestBody(required = false) Map<String, String> body) {
        String cancelToken = body != null ? body.get("cancelToken") : null;
        return ejecutarCancelacion(() -> paymentService.cancelarAnon(numeroPedido, cancelToken));
    }
}
