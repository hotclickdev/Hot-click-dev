package com.hotclick.scheduler;
import com.hotclick.utils.Constants;

import com.hotclick.model.WalletAcreditacionFallida;
import com.hotclick.repository.WalletAcreditacionFallidaRepository;
import com.hotclick.service.WalletDlqTxOps;
import com.hotclick.service.WalletService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.hibernate.JDBCException;
import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.LongSupplier;

/**
 * Reintenta acreditaciones que fallaron en el hilo @Async de AggregatorService.
 *
 * Diseño:
 *   - Corre cada 5 minutos con ShedLock (seguro en multi-pod).
 *   - Lee la DLQ por lotes acotados (hotclick.wallet.dlq.tamano-lote) con fecha_proximo_intento <= NOW().
 *   - Se detiene al vaciar la cola, al llegar a max-lotes o al agotar el presupuesto de tiempo
 *     (hotclick.wallet.dlq.presupuesto-segundos, por debajo de lockAtMostFor=PT4M).
 *   - Por cada item, llama WalletService.acreditarVentaReintentoDlq (timeout 15 s) — idempotente por diseño.
 *   - Si tiene éxito → marcarProcesado (REQUIRES_NEW).
 *   - Ítems con pedidoId nulo → AGOTADO directo sin acreditar (el índice V81 no los cubre).
 *   - Si DataIntegrityViolationException con SQLState 23505 y constraint exacto uq_wallet_tx_credito_por_pedido (V81)
 *     → ya acreditado → marcarProcesado.
 *   - El presupuesto de tiempo se comprueba antes de cada ítem; crédito y SELECT del lote tienen timeout de 15 s.
 *   - Cualquier otra violación de integridad u otro error → marcarFallo con backoff (2^n min, tope 2h).
 *   - Si intentos >= maxIntentos → AGOTADO + log.error CRÍTICO + métrica wallet.dlq.agotado.
 *
 * Un item AGOTADO requiere intervención manual (alertado por log.error CRÍTICO y la métrica wallet.dlq.agotado):
 *   1. Verificar si el saldo del emprendedor es correcto (buscar CREDITO_VENTA del pedido en wallet_transaccion;
 *      si existe, el índice uq_wallet_tx_credito_por_pedido ya garantiza que no hay doble crédito).
 *   2. Si no: INSERT manual en wallet_transaccion + UPDATE en wallet_tb.
 *   3. Marcar item como PROCESADO manualmente en la DLQ (el scheduler no reprocesa AGOTADO).
 */
@Component
public class WalletReconciliacionScheduler {

    private static final Logger log = LoggerFactory.getLogger(WalletReconciliacionScheduler.class);

    /** Índice único parcial del ledger para CREDITO_VENTA por pedido (V81__wallet_seguridad.sql). */
    public static final String CONSTRAINT_CREDITO_POR_PEDIDO = "uq_wallet_tx_credito_por_pedido";
    /** V166__wallet_tx_unico_por_referencia.sql: único por (referencia_tipo, referencia_id, tipo). */
    public static final String INDICE_TX_REFERENCIA_TIPO = "uq_wallet_tx_referencia_tipo";
    /** Nombres exactos que prueban que el crédito ya existe (V81 y V166). */
    static final java.util.Set<String> CONSTRAINTS_CREDITO_DUPLICADO =
        java.util.Set.of(CONSTRAINT_CREDITO_POR_PEDIDO, INDICE_TX_REFERENCIA_TIPO);

    private final WalletAcreditacionFallidaRepository dlqRepo;
    private final WalletService                       walletService;
    private final WalletDlqTxOps                     dlqTxOps;

    @Value("${hotclick.wallet.dlq.tamano-lote:50}")
    private int tamanoLote = 50;

    @Value("${hotclick.wallet.dlq.max-lotes:20}")
    private int maxLotes = 20;

    /** Debe quedar holgadamente por debajo de lockAtMostFor (PT4M = 240 s). */
    @Value("${hotclick.wallet.dlq.presupuesto-segundos:180}")
    private long presupuestoSegundos = 180;

    private LongSupplier relojMillis = System::currentTimeMillis;

    public WalletReconciliacionScheduler(WalletAcreditacionFallidaRepository dlqRepo,
                                          WalletService walletService,
                                          WalletDlqTxOps dlqTxOps) {
        this.dlqRepo       = dlqRepo;
        this.walletService = walletService;
        this.dlqTxOps      = dlqTxOps;
    }

    @Scheduled(fixedRate = 5 * 60 * 1000) // cada 5 minutos
    @SchedulerLock(name = "wallet_reconciliacion_dlq",
                   lockAtMostFor = "PT4M",
                   lockAtLeastFor = "PT30S")
    public void reintentarAcreditacionesFallidas() {
        int lote = Math.max(1, tamanoLote);
        long presupuestoMs = Duration.ofSeconds(Math.min(Math.max(presupuestoSegundos, 1), 210)).toMillis();
        long inicio = relojMillis.getAsLong();
        Set<Long> vistos = new HashSet<>();
        int procesados = 0;

        for (int n = 0; n < Math.max(1, maxLotes); n++) {
            List<WalletAcreditacionFallida> pendientes = dlqRepo.findPendientesParaReintento(
                LocalDateTime.now(Constants.ZONA_CR), PageRequest.of(0, lote));
            if (pendientes.isEmpty()) break;

            boolean hayNuevos = false;
            for (WalletAcreditacionFallida item : pendientes) {
                if (!vistos.add(item.getId())) continue; // ya intentado en esta corrida
                hayNuevos = true;
                // El presupuesto se comprueba ANTES de cada ítem: nunca se inicia un crédito sin tiempo.
                if (relojMillis.getAsLong() - inicio >= presupuestoMs) {
                    log.warn("[wallet-dlq] Presupuesto de tiempo agotado tras {} ítems; se continúa en la próxima corrida", procesados);
                    return;
                }
                procesar(item);
                procesados++;
            }
            if (!hayNuevos || pendientes.size() < lote) break;
        }
        if (procesados > 0) {
            log.info("[wallet-dlq] Reconciliación: {} acreditaciones reintentadas", procesados);
        }
    }

    private void procesar(WalletAcreditacionFallida item) {
        if (item.getPedidoId() == null) {
            // Sin pedidoId el índice parcial V81 (referencia_id) no protege contra doble crédito:
            // nunca se acredita automáticamente; pasa directo a revisión manual.
            dlqTxOps.marcarAgotadoSinCredito(item.getId(),
                "pedidoId nulo: el índice " + CONSTRAINT_CREDITO_POR_PEDIDO
                    + " no aplica; requiere revisión manual (no se acreditó)");
            return;
        }
        try {
            walletService.acreditarVentaReintentoDlq(
                item.getEmpresaId(),
                item.getMontoNeto(),
                item.getTotalBruto(),
                item.getComSaas(),
                item.getComGw(),
                item.getPedidoId()
            );
            dlqTxOps.marcarProcesado(item.getId());
            log.info("[wallet-dlq] Acreditación recuperada: pedido={} empresa={} neto=₡{}",
                item.getPedidoId(), item.getEmpresaId(), item.getMontoNeto());

        } catch (DataIntegrityViolationException dive) {
            if (esCreditoDuplicado(dive)) {
                // Un reintento anterior tuvo éxito pero no pudo marcar el item.
                dlqTxOps.marcarProcesado(item.getId());
                log.info("[wallet-dlq] Item DLQ #{} resuelto por {} (ya acreditado) — pedido={}",
                    item.getId(), CONSTRAINT_CREDITO_POR_PEDIDO, item.getPedidoId());
            } else {
                log.warn("[wallet-dlq] Violación de integridad distinta al crédito duplicado en item #{} — se reintenta", item.getId());
                dlqTxOps.marcarFallo(item.getId(), resumenIntegridad(dive));
            }
        } catch (Exception e) {
            // Solo el tipo: el mensaje puede traer SQL, valores de fila o datos del cliente.
            dlqTxOps.marcarFallo(item.getId(), e.getClass().getSimpleName());
        }
    }

    /**
     * Texto que se guarda en la DLQ ante una violación de integridad: solo SQLState y nombre del constraint
     * (nunca getMessage(), que trae SQL, valores de columnas y detalle del driver).
     */
    static String resumenIntegridad(Throwable ex) {
        String sqlState = null;
        String constraint = null;
        Set<Throwable> visitados = new HashSet<>();
        for (Throwable t = ex; t != null && visitados.add(t); t = t.getCause()) {
            if (sqlState == null && t instanceof JDBCException je) sqlState = je.getSQLState();
            if (sqlState == null && t instanceof SQLException se) sqlState = se.getSQLState();
            if (constraint == null && t instanceof ConstraintViolationException cve) constraint = cve.getConstraintName();
        }
        return "integridad sqlstate=" + seguro(sqlState) + " constraint=" + seguro(constraint);
    }

    /** SQLState y nombres de constraint son identificadores; cualquier otra cosa se descarta. */
    private static String seguro(String v) {
        return v != null && v.matches("[A-Za-z0-9_]{1,63}") ? v : "desconocido";
    }

    /** SQLState de PostgreSQL para unique_violation. */
    static final String SQLSTATE_UNIQUE_VIOLATION = "23505";

    /**
     * true solo si la cadena de causas trae SQLState 23505 Y el nombre exacto del constraint
     * uq_wallet_tx_credito_por_pedido (V81) o uq_wallet_tx_referencia_tipo (V166), obtenido de Hibernate ConstraintViolationException.getConstraintName()
     * (el ViolatedConstraintNameExtractor de PostgreSQLDialect solo lo resuelve para 23505/23503/23514).
     * Solo usa tipos JDBC/Hibernate: el driver PostgreSQL sigue en scope runtime. Sin fallback por texto
     * propio: si el nombre no se puede determinar, NO es duplicado (fail-closed → reintento/AGOTADO).
     */
    static boolean esCreditoDuplicado(Throwable ex) {
        boolean es23505 = false;
        String constraint = null;
        Set<Throwable> visitados = new HashSet<>();
        for (Throwable t = ex; t != null && visitados.add(t); t = t.getCause()) {
            if (t instanceof JDBCException je && SQLSTATE_UNIQUE_VIOLATION.equals(je.getSQLState())) {
                es23505 = true;
            }
            if (t instanceof SQLException se && SQLSTATE_UNIQUE_VIOLATION.equals(se.getSQLState())) {
                es23505 = true;
            }
            if (constraint == null && t instanceof ConstraintViolationException cve) {
                constraint = cve.getConstraintName();
            }
        }
        return es23505 && constraint != null && CONSTRAINTS_CREDITO_DUPLICADO.contains(constraint);
    }

    // Hooks para tests
    void configurarLotes(int tamanoLote, int maxLotes, long presupuestoSegundos, LongSupplier reloj) {
        this.tamanoLote = tamanoLote;
        this.maxLotes = maxLotes;
        this.presupuestoSegundos = presupuestoSegundos;
        this.relojMillis = reloj;
    }
}
