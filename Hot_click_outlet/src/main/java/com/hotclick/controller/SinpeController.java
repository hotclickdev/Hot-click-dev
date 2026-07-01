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

    @Autowired
    private SinpeService sinpeService;

    // ── Checkout autenticado ───────────────────────────────────────────────────
    @PostMapping("/checkout")
    public ResponseEntity<ResponseDTO> checkout(@Valid @RequestBody PaymentCheckoutRequest req) {
        try {
            String correo = SecurityContextHolder.getContext().getAuthentication().getName();
            var res = sinpeService.checkout(req, correo);
            return ResponseEntity.ok(ResponseDTO.success("Checkout SINPE iniciado", res));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Checkout invitado ──────────────────────────────────────────────────────
    @PostMapping("/guest-checkout")
    public ResponseEntity<ResponseDTO> guestCheckout(@Valid @RequestBody PaymentCheckoutRequest req) {
        try {
            var res = sinpeService.checkout(req, null);
            return ResponseEntity.ok(ResponseDTO.success("Checkout SINPE iniciado", res));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
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
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
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
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Admin: listar comprobantes ─────────────────────────────────────────────
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
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

    // ── Admin: aprobar comprobante ─────────────────────────────────────────────
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PostMapping("/admin/comprobantes/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        try {
            String adminEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            sinpeService.aprobar(id, adminEmail, null);
            return ResponseEntity.ok(ResponseDTO.success("Comprobante aprobado", null));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Admin: rechazar comprobante ────────────────────────────────────────────
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PostMapping("/admin/comprobantes/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(
            @PathVariable Long id,
            @RequestParam(required = false) String motivo) {
        try {
            String adminEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            sinpeService.rechazar(id, motivo, adminEmail, null);
            return ResponseEntity.ok(ResponseDTO.success("Comprobante rechazado", null));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
