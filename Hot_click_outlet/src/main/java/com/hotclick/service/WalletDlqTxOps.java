package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.WalletAcreditacionFallida;
import com.hotclick.repository.WalletAcreditacionFallidaRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
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

    /** Métrica Micrometer que se incrementa cada vez que un ítem pasa a AGOTADO. */
    public static final String METRICA_AGOTADO = "wallet.dlq.agotado";

    private final WalletAcreditacionFallidaRepository dlqRepo;
    private final Counter agotadoCounter;

    public WalletDlqTxOps(WalletAcreditacionFallidaRepository dlqRepo, MeterRegistry meterRegistry) {
        this.dlqRepo = dlqRepo;
        this.agotadoCounter = Counter.builder(METRICA_AGOTADO)
            .description("Acreditaciones de wallet que agotaron sus reintentos (requieren intervención manual)")
            .register(meterRegistry);
    }

    /** Backoff en minutos para el intento n: 2^n, con tope de 120 min. */
    static long calcularBackoffMinutos(int intentos) {
        if (intentos >= 7) return BACKOFF_TOPE_MINUTOS; // evita overflow y respeta el tope
        return Math.min(1L << Math.max(intentos, 0), BACKOFF_TOPE_MINUTOS);
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

    /** Timeout (s) de las transacciones de transición de estado de la DLQ. */
    static final int TIMEOUT_TX_SEGUNDOS = 8;

    /** Marca el ítem como procesado exitosamente (UPDATE condicional: solo si sigue PENDIENTE_REINTENTO). */
    @Transactional(propagation = Propagation.REQUIRES_NEW, timeout = TIMEOUT_TX_SEGUNDOS)
    public void marcarProcesado(Long dlqId) {
        if (dlqRepo.marcarProcesadoSiPendiente(dlqId, LocalDateTime.now(Constants.ZONA_CR)) == 0) {
            log.info("[wallet-dlq] Item #{} ya no está PENDIENTE_REINTENTO — marcarProcesado se ignora", dlqId);
        }
    }

    /**
     * Registra un fallo de reintento con backoff exponencial. UPDATE condicional sobre estado e intentos
     * leídos: si otro proceso o un humano cambió el ítem entretanto, no se pisa.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, timeout = TIMEOUT_TX_SEGUNDOS)
    public void marcarFallo(Long dlqId, String error) {
        dlqRepo.findById(dlqId).filter(WalletDlqTxOps::siguePendiente).ifPresent(item -> {
            int previos = item.getIntentos();
            int intentos = previos + 1;
            boolean agotado = intentos >= item.getMaxIntentos();
            long minutosBackoff = calcularBackoffMinutos(intentos);
            LocalDateTime proximo = agotado ? item.getFechaProximoIntento()
                : LocalDateTime.now(Constants.ZONA_CR).plusMinutes(minutosBackoff);
            String estado = agotado ? WalletAcreditacionFallida.AGOTADO : WalletAcreditacionFallida.PENDIENTE_REINTENTO;

            if (dlqRepo.registrarFalloSiPendiente(dlqId, previos, intentos, estado, truncar(error), proximo) == 0) {
                log.info("[wallet-dlq] Item #{} cambió entretanto — marcarFallo se ignora", dlqId);
                return;
            }
            if (agotado) {
                agotadoCounter.increment();
                log.error("[wallet-dlq] CRÍTICO — Acreditación AGOTADA: pedido={} empresa={} neto={} — REQUIERE INTERVENCIÓN MANUAL",
                    item.getPedidoId(), item.getEmpresaId(), item.getMontoNeto());
            } else {
                log.warn("[wallet-dlq] Reintento {} fallido para pedido={}. Próximo en {} min",
                    intentos, item.getPedidoId(), minutosBackoff);
            }
        });
    }

    /**
     * Pasa a AGOTADO sin intentar crédito (p. ej. pedidoId nulo: el índice V81 no protege).
     * UPDATE condicional: ignora ítems que ya no están PENDIENTE_REINTENTO.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, timeout = TIMEOUT_TX_SEGUNDOS)
    public void marcarAgotadoSinCredito(Long dlqId, String motivo) {
        if (dlqRepo.marcarAgotadoSiPendiente(dlqId, truncar(motivo)) == 0) {
            log.info("[wallet-dlq] Item #{} ya no está PENDIENTE_REINTENTO — marcarAgotadoSinCredito se ignora", dlqId);
            return;
        }
        agotadoCounter.increment();
        log.error("[wallet-dlq] CRÍTICO — Item #{} a AGOTADO sin acreditar: {} — REQUIERE INTERVENCIÓN MANUAL",
            dlqId, motivo);
    }

    /** Pre-chequeo barato; la garantía real es el WHERE estado='PENDIENTE_REINTENTO' del UPDATE. */
    private static boolean siguePendiente(WalletAcreditacionFallida item) {
        boolean pendiente = WalletAcreditacionFallida.PENDIENTE_REINTENTO.equals(item.getEstado());
        if (!pendiente) {
            log.info("[wallet-dlq] Item #{} ya no está PENDIENTE_REINTENTO (estado={}) — se ignora", item.getId(), item.getEstado());
        }
        return pendiente;
    }

    private String truncar(String texto) {
        if (texto == null) return null;
        return texto.length() > 2000 ? texto.substring(0, 2000) : texto;
    }
}
