package com.hotclick.controller;

import com.hotclick.model.GiftCard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.tenant.TenantLimitChecker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class GiftCardController {

    @Autowired private GiftCardService giftCardService;
    @Autowired private TenantLimitChecker tenantLimitChecker;

    // ── Admin: listar gift cards de la empresa ────────────────────────────────
    @GetMapping("/admin/gift-cards")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> listar() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            return ResponseEntity.status(403).build();
        }
        tenantLimitChecker.verificarFeature(empresaId, "giftCards");
        List<Map<String, Object>> result = giftCardService.listarPorEmpresa(empresaId)
            .stream().map(giftCardService::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Admin: crear gift card ────────────────────────────────────────────────
    @PostMapping("/admin/gift-cards")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        try {
            Long empresaId = TenantContext.get();
            if (empresaId == null) {
                return ResponseEntity.status(403).build();
            }
            tenantLimitChecker.verificarFeature(empresaId, "giftCards");
            Integer monto = ((Number) body.get("monto")).intValue();
            String vencimientoStr = (String) body.get("fechaVencimiento");
            String codigoManual   = (String) body.get("codigo");
            LocalDate vencimiento = (vencimientoStr != null && !vencimientoStr.isBlank())
                ? LocalDate.parse(vencimientoStr) : null;
            GiftCard gc = giftCardService.crear(empresaId, monto, vencimiento, codigoManual);
            return ResponseEntity.ok(giftCardService.toMap(gc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Admin: cancelar gift card ─────────────────────────────────────────────
    @DeleteMapping("/admin/gift-cards/{id}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> cancelar(@PathVariable Long id) {
        try {
            giftCardService.cancelar(id, TenantContext.get());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Validación pública (checkout) ─────────────────────────────────────────
    /**
     * Returns gift card details if valid for the authenticated user's empresa.
     * 401 if not authenticated (guests cannot use gift cards).
     */
    @GetMapping("/gift-cards/validar")
    public ResponseEntity<?> validar(@RequestParam String codigo) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Autenticación requerida"));
        }
        Optional<GiftCard> opt = giftCardService.validar(codigo.trim().toUpperCase(), empresaId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(Map.of("valida", false, "mensaje", "Código inválido, vencido o sin saldo"));
        }
        GiftCard gc = opt.get();
        return ResponseEntity.ok(Map.of(
            "valida",           true,
            "codigo",           gc.getCodigo(),
            "saldoActual",      gc.getSaldoActual(),
            "fechaVencimiento", gc.getFechaVencimiento() != null ? gc.getFechaVencimiento().toString() : ""
        ));
    }
}
