package com.hotclick.service;

import com.hotclick.model.WalletAcreditacionFallida;
import com.hotclick.repository.WalletAcreditacionFallidaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Operaciones de Dead-Letter Queue en transacciones REQUIRES_NEW independientes.
 *
 * Bean separado por la misma razón que ColaFacturacionOfflineTxOps:
 * si estos métodos vivieran en AggregatorService y se invocaran como this.encolar(),
 * el proxy de Spring no interceptaría la llamada y @Transactional sería ignorado.
 *
 * La propagación REQUIRES_NEW es crítica: encolar en la DLQ debe persistir aunque
 * la transacción del llamador haya fallado o no exista (contexto @Async).
 */
@Service
public class WalletDlqTxOps {

    private static final Logger log = LoggerFactory.getLogger(WalletDlqTxOps.class);

    // Backoff exponencial: 2^intentos minutos, tope de 120 min (2 horas)
    private static final long BACKOFF_TOPE_MINUTOS = 120L;

    private final WalletAcreditacionFallidaRepository dlqRepo;

    public WalletDlqTxOps(WalletAcreditacionFallidaRepository dlqRepo) {
        this.dlqRepo = dlqRepo;
    }

    /**
     * Encola una acreditación fallida para reintento posterior.
     * Idempotente: si ya existe una entrada para este pedido, no crea un duplicado.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void encolar(Long empresaId, Long pedidoId,
                        long totalBruto, long comSaas, long comGw, long montoNeto,
                        String error) {
        if (dlqRepo.existsByPedidoId(pedidoId)) {
            log.warn("[wallet-dlq] Pedido {} ya estaba en DLQ — actualizando error", pedidoId);
            return;
        }
        WalletAcreditacionFallida item = new WalletAcreditacionFallida();
        item.setEmpresaId(empresaId);
        item.setPedidoId(pedidoId);
        item.setTotalBruto(totalBruto);
        item.setComSaas(comSaas);
        item.setComGw(comGw);
        item.setMontoNeto(montoNeto);
        item.setUltimoError(truncar(error));
        dlqRepo.save(item);
        log.error("[wallet-dlq] ALERTA — Acreditación encolada para reintento: empresa={} pedido={} neto={}",
            empresaId, pedidoId, montoNeto);
    }

    /** Marca el ítem como procesado exitosamente. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarProcesado(Long dlqId) {
        dlqRepo.findById(dlqId).ifPresent(item -> {
            item.setEstado(WalletAcreditacionFallida.PROCESADO);
            item.setFechaCompletado(LocalDateTime.now());
            dlqRepo.save(item);
        });
    }

    /** Registra un fallo de reintento con backoff exponencial. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarFallo(Long dlqId, String error) {
        dlqRepo.findById(dlqId).ifPresent(item -> {
            int intentos = item.getIntentos() + 1;
            item.setIntentos(intentos);
            item.setUltimoError(truncar(error));

            if (intentos >= item.getMaxIntentos()) {
                item.setEstado(WalletAcreditacionFallida.AGOTADO);
                log.error("[wallet-dlq] CRÍTICO — Acreditación AGOTADA: pedido={} empresa={} neto={} — REQUIERE INTERVENCIÓN MANUAL",
                    item.getPedidoId(), item.getEmpresaId(), item.getMontoNeto());
            } else {
                long minutosBackoff = Math.min((long) Math.pow(2, intentos), BACKOFF_TOPE_MINUTOS);
                item.setFechaProximoIntento(LocalDateTime.now().plusMinutes(minutosBackoff));
                log.warn("[wallet-dlq] Reintento {} fallido para pedido={}. Próximo en {} min",
                    intentos, item.getPedidoId(), minutosBackoff);
            }
            dlqRepo.save(item);
        });
    }

    private String truncar(String texto) {
        if (texto == null) return null;
        return texto.length() > 2000 ? texto.substring(0, 2000) : texto;
    }
}
