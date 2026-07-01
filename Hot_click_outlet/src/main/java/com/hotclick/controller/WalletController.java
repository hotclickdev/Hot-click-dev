package com.hotclick.controller;

import com.hotclick.model.PayoutRequest;
import com.hotclick.model.Wallet;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.WalletService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class WalletController {

    private final WalletService walletService;
    private final CompanyScope  companyScope;

    public WalletController(WalletService walletService, CompanyScope companyScope) {
        this.walletService = walletService;
        this.companyScope  = companyScope;
    }

    // ── Emprendedor: consultar su propia billetera ───────────────────────────

    @GetMapping("/wallet/saldo")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<Wallet> saldo() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        return ResponseEntity.ok(walletService.obtenerWallet(empresaId));
    }

    @GetMapping("/wallet/transacciones")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<Page<WalletTransaccion>> historial(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        PageRequest pr = PageRequest.of(page, size, Sort.by("fechaCreacion").descending());
        return ResponseEntity.ok(walletService.historial(empresaId, pr));
    }

    @GetMapping("/wallet/payouts")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<Page<PayoutRequest>> misPayouts(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        PageRequest pr = PageRequest.of(page, size);
        return ResponseEntity.ok(walletService.payoutsByEmpresa(empresaId, pr));
    }

    // ── Emprendedor: solicitar retiro ────────────────────────────────────────

    @PostMapping("/wallet/payout")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR')")
    public ResponseEntity<PayoutRequest> solicitarPayout(@RequestBody PayoutRequestDTO dto) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        validate(dto);
        PayoutRequest pr = walletService.solicitarPayout(
            empresaId,
            dto.monto(),
            dto.metodo(),
            dto.destinoSinpe(),
            dto.destinoIban(),
            dto.nombreTitular(),
            dto.bancoDestino(),
            dto.notas()
        );
        return ResponseEntity.ok(pr);
    }

    // ── Admin: ver y resolver todos los payouts pendientes ──────────────────

    @GetMapping("/admin/payouts/pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PayoutRequest>> payoutsPendientes() {
        return ResponseEntity.ok(walletService.payoutsPendientes());
    }

    @PatchMapping("/admin/payouts/{id}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PayoutRequest> aprobar(@PathVariable Long id,
                                                 @RequestBody(required = false) Map<String, String> body) {
        String notas = body != null ? body.get("notas") : null;
        return ResponseEntity.ok(walletService.aprobarPayout(id, notas));
    }

    @PatchMapping("/admin/payouts/{id}/rechazar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PayoutRequest> rechazar(@PathVariable Long id,
                                                  @RequestBody(required = false) Map<String, String> body) {
        String notas = body != null ? body.get("notas") : null;
        return ResponseEntity.ok(walletService.rechazarPayout(id, notas));
    }

    // ── DTO de solicitud ─────────────────────────────────────────────────────

    record PayoutRequestDTO(
        long   monto,
        String metodo,
        String destinoSinpe,
        String destinoIban,
        String nombreTitular,
        String bancoDestino,
        String notas
    ) {}

    private void validate(PayoutRequestDTO dto) {
        if (dto.monto() <= 0) throw new IllegalArgumentException("El monto debe ser mayor a 0");

        String metodo = dto.metodo() != null ? dto.metodo().toUpperCase() : "SINPE";
        if ("SINPE".equals(metodo)) {
            if (dto.destinoSinpe() == null || !dto.destinoSinpe().matches("\\d{8}")) {
                throw new IllegalArgumentException("El número SINPE debe tener exactamente 8 dígitos");
            }
        } else if ("TRANSFERENCIA".equals(metodo)) {
            if (dto.destinoIban() == null || dto.destinoIban().isBlank()) {
                throw new IllegalArgumentException("El IBAN es requerido para transferencias bancarias");
            }
            if (dto.nombreTitular() == null || dto.nombreTitular().isBlank()) {
                throw new IllegalArgumentException("El nombre del titular es requerido");
            }
        } else {
            throw new IllegalArgumentException("Método de pago no válido: " + dto.metodo());
        }
    }
}
