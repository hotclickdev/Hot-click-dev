package com.hotclick.service.wallet;

import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletCreditService {

    private static final Logger log = LoggerFactory.getLogger(WalletCreditService.class);

    private final WalletRepository walletRepo;
    private final WalletTransaccionRepository txRepo;

    public WalletCreditService(WalletRepository walletRepo, WalletTransaccionRepository txRepo) {
        this.walletRepo = walletRepo;
        this.txRepo     = txRepo;
    }

    /**
     * Acredita el monto neto de una venta al wallet del emprendedor.
     *
     * ORDEN CRÍTICO para la consistencia:
     *   1. INSERT en ledger (con saveAndFlush para forzar evaluación del unique constraint)
     *   2. UPSERT atómico en wallet (solo si el INSERT tuvo éxito)
     *
     * @throws DataIntegrityViolationException si el pedido ya fue acreditado (idempotencia)
     */
    @Transactional
    public WalletTransaccion acreditarVenta(Long empresaId, long monto,
                                            long totalBruto, long comisionSaas, long comisionGw,
                                            Long pedidoId) {
        WalletTransaccion tx = new WalletTransaccion();
        tx.setEmpresaId(empresaId);
        tx.setTipo(WalletTransaccion.CREDITO_VENTA);
        tx.setMonto(monto);
        tx.setSaldoTrasMovimiento(0L);
        tx.setTotalBruto(totalBruto);
        tx.setComisionSaas(comisionSaas);
        tx.setComisionGw(comisionGw);
        tx.setReferenciaTipo(WalletTransaccion.REF_PEDIDO);
        tx.setReferenciaId(pedidoId);
        tx.setDescripcion("Venta procesada — pedido #" + pedidoId);
        tx = txRepo.saveAndFlush(tx);

        walletRepo.upsertAcreditar(empresaId, monto);

        long saldoActual = walletRepo.findSaldoDisponible(empresaId).orElse(monto);
        tx.setSaldoTrasMovimiento(saldoActual);
        WalletTransaccion saved = txRepo.save(tx);

        log.info("[wallet] +₡{} acreditados empresa={} pedido={} saldo={}",
            monto, empresaId, pedidoId, saldoActual);
        return saved;
    }
}
