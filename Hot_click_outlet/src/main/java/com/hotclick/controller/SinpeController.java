package com.hotclick.controller;

import com.hotclick.dto.ComprobanteSinpeDTO;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.SinpeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/sinpe")
public class SinpeController {

    /**
     * El SINPE entra a la cuenta de HotClick, la compra puede traer paquetes de varios negocios y la lista
     * no se filtra por empresa (datos personales del remitente): revisar comprobantes es solo de plataforma.
     */
    static final String SOLO_PLATAFORMA = "hasRole('ADMIN') or hasAuthority('global.metrics')";

    @Autowired
    private SinpeService sinpeService;
    @Autowired
    private com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard;

    // ── Checkout autenticado ───────────────────────────────────────────────────
    @PostMapping("/checkout")
    public ResponseEntity<ResponseDTO> checkout(@Valid @RequestBody PaymentCheckoutRequest req) {
        try {
            String correo = SecurityContextHolder.getContext().getAuthentication().getName();
            var res = sinpeService.checkout(req, correo);
            return ResponseEntity.ok(ResponseDTO.success("Checkout SINPE iniciado", res));
        } catch (com.hotclick.exception.AutocompraNegocioException e) {
            return autocompra(e);
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
        }
    }

    private static ResponseEntity<ResponseDTO> autocompra(com.hotclick.exception.AutocompraNegocioException e) {
        return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage(),
            java.util.Map.of("codigo", com.hotclick.exception.AutocompraNegocioException.CODIGO)));
    }

    // ── Checkout invitado ──────────────────────────────────────────────────────
    @PostMapping("/guest-checkout")
    public ResponseEntity<ResponseDTO> guestCheckout(@Valid @RequestBody PaymentCheckoutRequest req,
                                                     jakarta.servlet.http.HttpServletRequest http) {
        return guestCheckoutGuard.ejecutar(req, http, () -> guestCheckoutSinGuard(req));
    }

    private ResponseEntity<ResponseDTO> guestCheckoutSinGuard(PaymentCheckoutRequest req) {
        try {
            var res = sinpeService.checkout(req, null);
            return ResponseEntity.ok(ResponseDTO.success("Checkout SINPE iniciado", res));
        } catch (com.hotclick.exception.AutocompraNegocioException e) {
            return autocompra(e);
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
        }
    }

    // ── Subir comprobante (autenticado) ────────────────────────────────────────
    @PostMapping("/{numeroPedido}/comprobante")
    public ResponseEntity<ResponseDTO> subirComprobante(
            @PathVariable String numeroPedido,
            @RequestParam("imagen")          MultipartFile imagen,
            @RequestParam("nombreRemitente") String nombreRemitente,
            @RequestParam(value = "cedulaRemitente",   required = false) String cedulaRemitente,
            @RequestParam(value = "telefonoRemitente", required = false) String telefonoRemitente) {
        try {
            String correo = SecurityContextHolder.getContext().getAuthentication().getName();
            sinpeService.subirComprobante(numeroPedido, imagen, nombreRemitente,
                                          cedulaRemitente, telefonoRemitente, correo);
            return ResponseEntity.ok(ResponseDTO.success("Comprobante recibido. En revisión.", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
        }
    }

    // ── Subir comprobante (invitado) ───────────────────────────────────────────
    @PostMapping("/guest/{numeroPedido}/comprobante")
    public ResponseEntity<ResponseDTO> guestSubirComprobante(
            @PathVariable String numeroPedido,
            @RequestParam("imagen")           MultipartFile imagen,
            @RequestParam("nombreRemitente")  String nombreRemitente,
            @RequestParam("correoUsuario")    String correoUsuario,
            @RequestParam(value = "cedulaRemitente",   required = false) String cedulaRemitente,
            @RequestParam(value = "telefonoRemitente", required = false) String telefonoRemitente) {
        try {
            sinpeService.subirComprobante(numeroPedido, imagen, nombreRemitente,
                                          cedulaRemitente, telefonoRemitente, correoUsuario);
            return ResponseEntity.ok(ResponseDTO.success("Comprobante recibido. En revisión.", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("[checkout] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo procesar el pedido. Intentá de nuevo."));
        }
    }

    // ── Admin: listar comprobantes ─────────────────────────────────────────────
    @PreAuthorize(SOLO_PLATAFORMA)
    @GetMapping("/admin/comprobantes")
    public ResponseEntity<ResponseDTO> listarComprobantes(
            @RequestParam(required = false)            String estado,
            @RequestParam(defaultValue = "0")          int page,
            @RequestParam(defaultValue = "20")         int size) {
        Page<ComprobanteSinpeDTO> resultado = sinpeService.listar(estado, PageRequest.of(page, Math.min(size, 50)))
            .map(ComprobanteSinpeDTO::from);
        return ResponseEntity.ok(ResponseDTO.success("Comprobantes SINPE", Map.of(
            "content",       resultado.getContent(),
            "totalPages",    resultado.getTotalPages(),
            "totalElements", resultado.getTotalElements(),
            "page",          resultado.getNumber()
        )));
    }

    // ── C1: URL firmada del comprobante (privado en S3) ─────────────────────────
    /** Dueño del pedido (sesión autenticada). Invitados sin cuenta no pueden pedirla (fail-closed). */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/comprobantes/{id}/url-firmada")
    public ResponseEntity<ResponseDTO> urlFirmadaDueno(@PathVariable Long id) {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return urlFirmada(id, correo, false);
    }

    @PreAuthorize(SOLO_PLATAFORMA)
    @GetMapping("/admin/comprobantes/{id}/url-firmada")
    public ResponseEntity<ResponseDTO> urlFirmadaAdmin(@PathVariable Long id) {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return urlFirmada(id, correo, true);
    }

    private ResponseEntity<ResponseDTO> urlFirmada(Long id, String correo, boolean admin) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("URL firmada",
                Map.of("url", sinpeService.urlFirmadaComprobante(id, correo, admin))));
        } catch (SecurityException | com.hotclick.exception.RecursoNoEncontradoException e) {
            // Mismo 404 para «no existe» y «no es tuyo»: no se filtra la existencia del comprobante.
            return ResponseEntity.status(404).body(ResponseDTO.error("Comprobante no encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(ResponseDTO.error("Comprobante no disponible por ahora"));
        }
    }

    // ── Admin: aprobar comprobante ─────────────────────────────────────────────
    @PreAuthorize(SOLO_PLATAFORMA)
    @PostMapping("/admin/comprobantes/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        try {
            String adminEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            sinpeService.aprobar(id, adminEmail, null);
            return ResponseEntity.ok(ResponseDTO.success("Comprobante aprobado", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    // ── Admin: rechazar comprobante ────────────────────────────────────────────
    @PreAuthorize(SOLO_PLATAFORMA)
    @PostMapping("/admin/comprobantes/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(
            @PathVariable Long id,
            @RequestParam(required = false) String motivo,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String adminEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            sinpeService.rechazar(id, AdminPagoController.motivoEscrito(motivo, body), adminEmail, null);
            return ResponseEntity.ok(ResponseDTO.success("Comprobante rechazado", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }
}
