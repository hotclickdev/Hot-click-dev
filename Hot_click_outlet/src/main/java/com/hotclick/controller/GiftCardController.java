package com.hotclick.controller;

import com.hotclick.model.GiftCard;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.TenantContext;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.tenant.TenantLimitChecker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class GiftCardController {

    @Autowired private GiftCardService giftCardService;
    @Autowired private TenantLimitChecker tenantLimitChecker;
    @Autowired private RateLimiter rateLimiter;
    @Autowired private CompanyScope companyScope;

    // Tope por usuario de GET /gift-cards/validar (un código con saldo vale dinero: sin tope se prueban códigos).
    @Value("${hotclick.ratelimit.giftcard-validar.max:10}")    private int validarMax = 10;
    @Value("${hotclick.ratelimit.giftcard-validar.window:60}") private int validarWindow = 60;

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
            Integer monto = montoDe(body.get("monto"));
            String vencimientoStr = textoOpcional(body.get("fechaVencimiento"), "fechaVencimiento");
            String codigoManual   = textoOpcional(body.get("codigo"), "codigo");
            LocalDate vencimiento = (vencimientoStr != null && !vencimientoStr.isBlank())
                ? LocalDate.parse(vencimientoStr) : null;
            GiftCard gc = giftCardService.crear(empresaId, monto, vencimiento, codigoManual);
            return ResponseEntity.ok(giftCardService.toMap(gc));
        } catch (GiftCardService.CodigoGiftCardDuplicadoException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "La fechaVencimiento debe tener formato AAAA-MM-DD."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Monto entero en colones: ausente, texto, decimal o fuera del rango de Integer → 400 (antes NPE/ClassCast → 500). */
    static Integer montoDe(Object raw) {
        String mensaje = "El monto es obligatorio y debe ser un número entero.";
        if (!(raw instanceof Number n)) {
            throw new IllegalArgumentException(mensaje);
        }
        try {
            return new BigDecimal(n.toString()).intValueExact();
        } catch (ArithmeticException | NumberFormatException e) {
            throw new IllegalArgumentException(mensaje);
        }
    }

    private static String textoOpcional(Object raw, String campo) {
        if (raw == null) return null;
        if (raw instanceof String s) return s;
        throw new IllegalArgumentException("El campo " + campo + " debe ser texto.");
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
        // Por usuario y FAIL-CLOSED: si la BD del limitador falla, se niega (es dinero, no disponibilidad).
        Long usuarioId = companyScope.getCurrentUserId();
        if (usuarioId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Autenticación requerida"));
        }
        if (!rateLimiter.tryAcquireEstricto("user:" + usuarioId + ":gift-cards:validar", validarMax, validarWindow)) {
            return ResponseEntity.status(429).body(Map.of("error",
                "Demasiados intentos. Esperá un momento antes de volver a intentar."));
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
            "empresaId",        empresaId,
            "fechaVencimiento", gc.getFechaVencimiento() != null ? gc.getFechaVencimiento().toString() : ""
        ));
    }
}
