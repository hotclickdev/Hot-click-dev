package com.hotclick.service;
nimport com.hotclick.utils.Constants;

import com.hotclick.model.PayoutRequest;
import com.hotclick.model.Wallet;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
 *   La excepción propagada por @Transactional revierte la TX sin cambios.
 *   Nunca se ejecuta upsertAcreditar si el INSERT de ledger falló.
 *
 * [BUG-3a CORREGIDO] Race condition en aprobarPayout:
 *   Usa PESSIMISTIC_WRITE (SELECT FOR UPDATE) para serializar aprobaciones
 *   concurrentes. Único admin puede procesar un payout a la vez.
 *   confirmarPayout tiene guard AND saldo_retenido >= :monto en el WHERE.
 *
 * [BUG-3b CORREGIDO] Multiple payouts simultáneos:
 *   unique partial index (uq_payout_activo_por_empresa en V81) previene
 *   que existan dos payouts PENDIENTE/EN_PROCESO para la misma empresa.
 */
@Service
public class WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletService.class);

    private final WalletRepository walletRepo;
    private final WalletTransaccionRepository txRepo;
    private final PayoutRequestRepository payoutRepo;

    public WalletService(WalletRepository walletRepo,
                         WalletTransaccionRepository txRepo,
                         PayoutRequestRepository payoutRepo) {
        this.walletRepo = walletRepo;
        this.txRepo     = txRepo;
        this.payoutRepo = payoutRepo;
    }

    // ── Lectura ──────────────────────────────────────────────────────────────

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

    // ── Acreditar venta ──────────────────────────────────────────────────────

    /**
     * Acredita el monto neto de una venta al wallet del emprendedor.
     *
     * ORDEN CRÍTICO para la consistencia:
     *   1. INSERT en ledger (con saveAndFlush para forzar evaluación del unique constraint)
     *   2. UPSERT atómico en wallet (solo si el INSERT tuvo éxito)
     *
     * Si el INSERT falla por unique constraint (pedido ya acreditado), la excepción
     * se propaga hacia arriba. Spring revierte el @Transactional, que no hizo nada
     * al wallet. AggregatorService captura DataIntegrityViolationException como
     * duplicado benigno (no lo envía a la DLQ).
     *
     * @throws DataIntegrityViolationException si el pedido ya fue acreditado (idempotencia)
     */
    @Transactional
    public WalletTransaccion acreditarVenta(Long empresaId, long monto,
                                            long totalBruto, long comisionSaas, long comisionGw,
                                            Long pedidoId) {
        // Paso 1: INSERT ledger PRIMERO.
        // El unique partial index uq_wallet_tx_credito_por_pedido es el guard real.
        // Si este INSERT falla, el método lanza DataIntegrityViolationException
        // y el UPSERT del wallet NUNCA se ejecuta. Rollback = no-op.
        WalletTransaccion tx = new WalletTransaccion();
        tx.setEmpresaId(empresaId);
        tx.setTipo(WalletTransaccion.CREDITO_VENTA);
        tx.setMonto(monto);
        tx.setSaldoTrasMovimiento(0L); // se actualiza en el paso 3
        tx.setTotalBruto(totalBruto);
        tx.setComisionSaas(comisionSaas);
        tx.setComisionGw(comisionGw);
        tx.setReferenciaTipo(WalletTransaccion.REF_PEDIDO);
        tx.setReferenciaId(pedidoId);
        tx.setDescripcion("Venta procesada — pedido #" + pedidoId);
        // saveAndFlush fuerza el INSERT inmediato dentro de la TX activa.
        // PostgreSQL evalúa el unique index y lanza violation si hay duplicado.
        tx = txRepo.saveAndFlush(tx);

        // Paso 2: UPSERT wallet — solo alcanzable si el INSERT de ledger tuvo éxito.
        walletRepo.upsertAcreditar(empresaId, monto);

        // Paso 3: Leer saldo actualizado para completar el ledger (informativo).
        long saldoActual = walletRepo.findSaldoDisponible(empresaId).orElse(monto);
        tx.setSaldoTrasMovimiento(saldoActual);
        WalletTransaccion saved = txRepo.save(tx);

        log.info("[wallet] +₡{} acreditados empresa={} pedido={} saldo={}",
            monto, empresaId, pedidoId, saldoActual);
        return saved;
    }

    // ── Solicitar payout ─────────────────────────────────────────────────────

    @Transactional
    public PayoutRequest solicitarPayout(Long empresaId, long monto, String metodo,
                                         String destinoSinpe, String destinoIban,
                                         String nombreTitular, String bancoDestino,
                                         String notas) {
        if (monto <= 0) throw new IllegalArgumentException("El monto del payout debe ser mayor a 0");

        // Nota: el check de payout activo sigue siendo una optimización rápida,
        // pero el guard definitivo es el unique partial index uq_payout_activo_por_empresa.
        // Si dos solicitudes pasan este check simultáneamente, el INSERT de PayoutRequest
        // lanzará DataIntegrityViolationException en el segundo, previniendo el doble payout.
        if (payoutRepo.existsByEmpresaIdAndEstadoIn(empresaId,
                List.of(PayoutRequest.PENDIENTE, PayoutRequest.EN_PROCESO))) {
            throw new IllegalStateException("Ya tienes un retiro en proceso. Espera a que sea resuelto antes de solicitar otro.");
        }

        // Retención atómica: UPDATE con WHERE saldo_disponible >= :monto
        int filasActualizadas = walletRepo.retenerParaPayout(empresaId, monto);
        if (filasActualizadas == 0) {
            throw new IllegalStateException("Saldo insuficiente para procesar el retiro de ₡" +
                String.format("%,d", monto));
        }

        long saldoActual = walletRepo.findSaldoDisponible(empresaId).orElse(0L);
        WalletTransaccion txRetencion = new WalletTransaccion();
        txRetencion.setEmpresaId(empresaId);
        txRetencion.setTipo(WalletTransaccion.RETENCION_PAYOUT);
        txRetencion.setMonto(-monto);
        txRetencion.setSaldoTrasMovimiento(saldoActual);
        txRetencion.setReferenciaTipo(WalletTransaccion.REF_PAYOUT);
        txRetencion.setDescripcion("Retiro solicitado — en revisión");
        txRetencion = txRepo.save(txRetencion);

        PayoutRequest pr = new PayoutRequest();
        pr.setEmpresaId(empresaId);
        pr.setMonto(monto);
        pr.setMetodo(metodo != null ? metodo.toUpperCase() : PayoutRequest.METODO_SINPE);
        pr.setDestinoSinpe(destinoSinpe);
        pr.setDestinoIban(destinoIban);
        pr.setNombreTitular(nombreTitular);
        pr.setBancoDestino(bancoDestino);
        pr.setNotasSolicitante(notas);
        pr.setWalletTxRetencionId(txRetencion.getId());
        // Si el unique index uq_payout_activo_por_empresa rechaza este save (race condition),
        // la DataIntegrityViolationException se propaga y Spring revierte toda la TX,
        // incluyendo la retención — el saldo vuelve a su estado anterior.
        pr = payoutRepo.save(pr);

        txRetencion.setReferenciaId(pr.getId());
        txRepo.save(txRetencion);

        log.info("[wallet] Payout #{} solicitado empresa={} monto=₡{} metodo={}",
            pr.getId(), empresaId, monto, pr.getMetodo());
        return pr;
    }

    // ── Aprobar / rechazar payout (admin) ────────────────────────────────────

    /**
     * Aprueba un payout y libera el saldo retenido como pagado.
     *
     * [BUG-3a CORREGIDO] Usa findByIdForUpdate (SELECT FOR UPDATE) para serializar
     * aprobaciones concurrentes. Si dos admins intentan aprobar el mismo payout
     * simultáneamente, el segundo bloquea hasta que el primero commitea, y al
     * re-evaluar el guard de estado ve PAGADO → lanza IllegalStateException.
     * confirmarPayout tiene AND saldo_retenido >= :monto para prevenir negativos.
     */
    @Transactional
    public PayoutRequest aprobarPayout(Long payoutId, String notasAdmin) {
        // SELECT FOR UPDATE — serializa aprobaciones concurrentes del mismo payout
        PayoutRequest pr = payoutRepo.findByIdForUpdate(payoutId)
            .orElseThrow(() -> new IllegalArgumentException("Payout no encontrado: " + payoutId));

        if (!PayoutRequest.PENDIENTE.equals(pr.getEstado()) &&
            !PayoutRequest.EN_PROCESO.equals(pr.getEstado())) {
            throw new IllegalStateException("El payout ya fue " + pr.getEstado());
        }

        // La BD evalúa AND saldo_retenido >= :monto antes de decrementar.
        // Si retorna 0 filas → inconsistencia de datos detectada en tiempo real.
        int filas = walletRepo.confirmarPayout(pr.getEmpresaId(), pr.getMonto());
        if (filas == 0) {
            throw new IllegalStateException(
                "Saldo retenido insuficiente para empresa=" + pr.getEmpresaId() +
                " — posible inconsistencia de datos. Revisar manualmente.");
        }

        long saldoActual = walletRepo.findSaldoDisponible(pr.getEmpresaId()).orElse(0L);
        WalletTransaccion txPago = new WalletTransaccion();
        txPago.setEmpresaId(pr.getEmpresaId());
        txPago.setTipo(WalletTransaccion.DEBITO_PAYOUT);
        txPago.setMonto(-pr.getMonto());
        txPago.setSaldoTrasMovimiento(saldoActual);
        txPago.setReferenciaTipo(WalletTransaccion.REF_PAYOUT);
        txPago.setReferenciaId(pr.getId());
        txPago.setDescripcion("Retiro pagado — payout #" + pr.getId());
        txPago = txRepo.save(txPago);

        pr.setEstado(PayoutRequest.PAGADO);
        pr.setFechaPago(LocalDateTime.now(Constants.ZONA_CR));
        pr.setNotasAdmin(notasAdmin);
        pr.setWalletTxPagoId(txPago.getId());
        pr = payoutRepo.save(pr);

        log.info("[wallet] Payout #{} APROBADO empresa={} monto=₡{}",
            payoutId, pr.getEmpresaId(), pr.getMonto());
        return pr;
    }

    @Transactional
    public PayoutRequest rechazarPayout(Long payoutId, String notasAdmin) {
        // SELECT FOR UPDATE — evita race condition con aprobarPayout concurrente
        PayoutRequest pr = payoutRepo.findByIdForUpdate(payoutId)
            .orElseThrow(() -> new IllegalArgumentException("Payout no encontrado: " + payoutId));

        if (!PayoutRequest.PENDIENTE.equals(pr.getEstado()) &&
            !PayoutRequest.EN_PROCESO.equals(pr.getEstado())) {
            throw new IllegalStateException("El payout ya fue " + pr.getEstado());
        }

        walletRepo.liberarRetencion(pr.getEmpresaId(), pr.getMonto());

        long saldoActual = walletRepo.findSaldoDisponible(pr.getEmpresaId()).orElse(0L);
        WalletTransaccion txLib = new WalletTransaccion();
        txLib.setEmpresaId(pr.getEmpresaId());
        txLib.setTipo(WalletTransaccion.LIBERACION_PAYOUT);
        txLib.setMonto(pr.getMonto());
        txLib.setSaldoTrasMovimiento(saldoActual);
        txLib.setReferenciaTipo(WalletTransaccion.REF_PAYOUT);
        txLib.setReferenciaId(pr.getId());
        txLib.setDescripcion("Retiro rechazado — fondos liberados — payout #" + pr.getId());
        txRepo.save(txLib);

        pr.setEstado(PayoutRequest.RECHAZADO);
        pr.setNotasAdmin(notasAdmin);
        pr = payoutRepo.save(pr);

        log.info("[wallet] Payout #{} RECHAZADO empresa={} — fondos liberados", payoutId, pr.getEmpresaId());
        return pr;
    }

    // ── Admin: lista global ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PayoutRequest> payoutsPendientes() {
        return payoutRepo.findByEstadoOrderByFechaSolicitudAsc(PayoutRequest.PENDIENTE);
    }

    @Transactional(readOnly = true)
    public Page<PayoutRequest> payoutsByEmpresa(Long empresaId, Pageable pageable) {
        return payoutRepo.findByEmpresaIdOrderByFechaSolicitudDesc(empresaId, pageable);
    }
}
