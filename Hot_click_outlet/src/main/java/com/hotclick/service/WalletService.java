package com.hotclick.service;

import com.hotclick.model.PayoutRequest;
import com.hotclick.model.Wallet;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.service.wallet.WalletCreditService;
import com.hotclick.service.wallet.WalletPayoutAdminService;
import com.hotclick.service.wallet.WalletPayoutRequestService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Operaciones atómicas sobre la billetera virtual del emprendedor.
 *
 * === GARANTÍAS DE CONSISTENCIA ===
 *
 * [BUG-1 CORREGIDO] Idempotencia en acreditarVenta:
 *   El ledger INSERT precede al wallet UPSERT. Si dos webhooks concurrentes
 *   intentan acreditar el mismo pedido, el unique partial index
 *   (uq_wallet_tx_credito_por_pedido en V81) hace fallar el segundo INSERT.
 *
 * [BUG-3a CORREGIDO] Race condition en aprobarPayout:
 *   Usa PESSIMISTIC_WRITE (SELECT FOR UPDATE) para serializar aprobaciones
 *   concurrentes.
 *
 * [BUG-3b CORREGIDO] Multiple payouts simultáneos:
 *   unique partial index (uq_payout_activo_por_empresa en V81) previene
 *   que existan dos payouts PENDIENTE/EN_PROCESO para la misma empresa.
 */
@Service
public class WalletService {

    private final WalletRepository walletRepo;
    private final WalletTransaccionRepository txRepo;
    private final PayoutRequestRepository payoutRepo;
    private final WalletCreditService creditService;
    private final WalletPayoutRequestService payoutRequestService;
    private final WalletPayoutAdminService payoutAdminService;

    public WalletService(WalletRepository walletRepo,
                         WalletTransaccionRepository txRepo,
                         PayoutRequestRepository payoutRepo,
                         WalletCreditService creditService,
                         WalletPayoutRequestService payoutRequestService,
                         WalletPayoutAdminService payoutAdminService) {
        this.walletRepo            = walletRepo;
        this.txRepo                = txRepo;
        this.payoutRepo            = payoutRepo;
        this.creditService         = creditService;
        this.payoutRequestService  = payoutRequestService;
        this.payoutAdminService    = payoutAdminService;
    }

    @Transactional(readOnly = true)
    public Wallet obtenerWallet(Long empresaId) {
        return walletRepo.findByEmpresaId(empresaId)
            .orElseGet(() -> {
                Wallet w = new Wallet();
                w.setEmpresaId(empresaId);
                return w;
            });
    }

    @Transactional(readOnly = true)
    public Page<WalletTransaccion> historial(Long empresaId, Pageable pageable) {
        return txRepo.findByEmpresaIdOrderByFechaCreacionDesc(empresaId, pageable);
    }

    @Transactional
    public WalletTransaccion acreditarVenta(Long empresaId, long monto,
                                            long totalBruto, long comisionSaas, long comisionGw,
                                            Long pedidoId) {
        return creditService.acreditarVenta(empresaId, monto, totalBruto, comisionSaas, comisionGw, pedidoId);
    }

    @Transactional
    public PayoutRequest solicitarPayout(Long empresaId, long monto, String metodo,
                                         String destinoSinpe, String destinoIban,
                                         String nombreTitular, String bancoDestino,
                                         String notas) {
        return payoutRequestService.solicitarPayout(empresaId, monto, metodo,
            destinoSinpe, destinoIban, nombreTitular, bancoDestino, notas);
    }

    @Transactional
    public PayoutRequest aprobarPayout(Long payoutId, String notasAdmin) {
        return payoutAdminService.aprobarPayout(payoutId, notasAdmin);
    }

    @Transactional
    public PayoutRequest rechazarPayout(Long payoutId, String notasAdmin) {
        return payoutAdminService.rechazarPayout(payoutId, notasAdmin);
    }

    @Transactional(readOnly = true)
    public List<PayoutRequest> payoutsPendientes() {
        return payoutRepo.findByEstadoOrderByFechaSolicitudAsc(PayoutRequest.PENDIENTE);
    }

    @Transactional(readOnly = true)
    public Page<PayoutRequest> payoutsByEmpresa(Long empresaId, Pageable pageable) {
        return payoutRepo.findByEmpresaIdOrderByFechaSolicitudDesc(empresaId, pageable);
    }
}
