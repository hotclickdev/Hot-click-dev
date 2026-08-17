package com.hotclick.controller.observabilidad;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import com.zaxxer.hikari.HikariDataSource;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Construcción de métricas del dashboard de observabilidad.
 * Extraído bit-idéntico de ObservabilityController — no cambia comportamiento.
 */
@Component
public class ObservabilityMetricsHandler {

    private static final Logger log = LoggerFactory.getLogger(ObservabilityMetricsHandler.class);

    @Autowired private EmpresaRepository          empresaRepository;
    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private PagoRepository             pagoRepository;
    @Autowired private UsuarioRepository          usuarioRepository;
    @Autowired private SecurityAuditLogRepository auditLogRepository;
    @Autowired private SecurityAlertRepository    alertRepository;
    @Autowired private AiUsoRepository            aiUsoRepository;
    @Autowired private WebhookEventRepository     webhookEventRepository;
    @Autowired private ProductoRepository         productoRepository;
    @Autowired private JdbcTemplate               jdbc;
    @Autowired private CircuitBreakerRegistry     circuitBreakerRegistry;
    @Autowired private CacheManager               cacheManager;
    @Autowired private DataSource                 dataSource;

    public ResponseEntity<ResponseDTO> getMetrics() {
        try {
            Map<String, Object> metrics = new LinkedHashMap<>();

            // ── Empresas ─────────────────────────────────────────────────────
            Map<String, Object> empresas = new LinkedHashMap<>();
            empresas.put("activas",  empresaRepository.countByEstadoEmpresa("ACTIVO"));
            empresas.put("trial",    empresaRepository.countByEstadoEmpresa("TRIAL"));
            empresas.put("vencidas", empresaRepository.countByEstadoEmpresa("VENCIDO"));
            empresas.put("total",    empresaRepository.count());
            metrics.put("empresas", empresas);

            // ── Pedidos ───────────────────────────────────────────────────────
            Map<String, Object> pedidos = new LinkedHashMap<>();
            pedidos.put("pendientes",    pedidoRepository.countByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, 1));
            pedidos.put("enPreparacion", pedidoRepository.countByEstadoPedidoAndEstado("EN_PREPARACION", 1));
            pedidos.put("enviados",      pedidoRepository.countByEstadoPedidoAndEstado("ENVIADO", 1));
            pedidos.put("total",         pedidoRepository.countTotalPedidos());
            metrics.put("pedidos", pedidos);

            // ── Pagos ─────────────────────────────────────────────────────────
            Map<String, Object> pagos = new LinkedHashMap<>();
            pagos.put("capturados", pagoRepository.countByEstadoPago("CAPTURADO"));
            pagos.put("pendientes", pagoRepository.countByEstadoPago("PENDIENTE"));
            pagos.put("fallidos",   pagoRepository.countByEstadoPago("FALLIDO"));
            metrics.put("pagos", pagos);

            // ── Usuarios ──────────────────────────────────────────────────────
            Map<String, Object> usuarios = new LinkedHashMap<>();
            usuarios.put("activos",   usuarioRepository.countUsuariosActivos());
            usuarios.put("pendientes",usuarioRepository.countUsuariosPendientes());
            metrics.put("usuarios", usuarios);

            // ── Seguridad (últimas 24h) ────────────────────────────────────────
            LocalDateTime hace24h = LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
            Map<String, Object> seguridad = new LinkedHashMap<>();
            seguridad.put("eventosTotal24h",    auditLogRepository.countByTimestampAfter(hace24h));
            seguridad.put("eventosCriticos24h", auditLogRepository.countBySeverityAndTimestampAfter("CRITICAL", hace24h));
            seguridad.put("intentosLogin24h",   auditLogRepository.countByEventTypeAndTimestampAfter("LOGIN_FAILED", hace24h));
            seguridad.put("rateLimitHits24h",   auditLogRepository.countByEventTypeAndTimestampAfter("RATE_LIMIT_TRIGGERED", hace24h));
            seguridad.put("alertasAbiertas",    alertRepository.countByResolvedFalse());
            seguridad.put("alertasCriticas",    alertRepository.countBySeverityAndResolvedFalse("CRITICAL"));
            metrics.put("seguridad", seguridad);

            // ── IA (mes actual) ────────────────────────────────────────────────
            int anio = LocalDate.now(Constants.ZONA_CR).getYear();
            int mes  = LocalDate.now(Constants.ZONA_CR).getMonthValue();
            Map<String, Object> ia = new LinkedHashMap<>();
            // Claude Haiku 3.5: $0.80/M input · $4.00/M output (https://www.anthropic.com/pricing)
            final double PRECIO_INPUT  = 0.80;
            final double PRECIO_OUTPUT = 4.00;

            // ── Mes actual ────────────────────────────────────────────────────
            long tokensEntrada = aiUsoRepository.sumTokensEntradaGlobales(anio, mes);
            long tokensSalida  = aiUsoRepository.sumTokensSalidaGlobales(anio, mes);
            long llamadasMes   = aiUsoRepository.sumLlamadasGlobales(anio, mes);
            double costoMes    = (tokensEntrada / 1_000_000.0 * PRECIO_INPUT)
                               + (tokensSalida  / 1_000_000.0 * PRECIO_OUTPUT);

            ia.put("anio",             anio);
            ia.put("mes",              mes);
            ia.put("llamadasMes",      llamadasMes);
            ia.put("tokensEntradaMes", tokensEntrada);
            ia.put("tokensSalidaMes",  tokensSalida);
            ia.put("tokensMes",        tokensEntrada + tokensSalida);
            ia.put("costoEstimadoUSD", String.format("$%.4f", costoMes));

            // ── Costo diario promedio (mensual / días transcurridos) ──────────
            int diaActual = LocalDate.now(Constants.ZONA_CR).getDayOfMonth();
            double costoDiario = diaActual > 0 ? costoMes / diaActual : 0;
            ia.put("costoDiarioPromedioUSD", String.format("$%.4f", costoDiario));

            // ── Acumulado histórico (todos los meses) ─────────────────────────
            try {
                long acumEntrada = aiUsoRepository.sumTokensEntradaAcumulados();
                long acumSalida  = aiUsoRepository.sumTokensSalidaAcumulados();
                double costoAcum = (acumEntrada / 1_000_000.0 * PRECIO_INPUT)
                                 + (acumSalida  / 1_000_000.0 * PRECIO_OUTPUT);
                ia.put("costoAcumuladoUSD",    String.format("$%.2f", costoAcum));
                ia.put("tokensAcumulados",      acumEntrada + acumSalida);
            } catch (Exception e) {
                log.warn("[observabilidad] No se pudo calcular costo acumulado IA: {}", e.getMessage());
            }

            // ── Top 5 empresas por tokens este mes ────────────────────────────
            try {
                List<Object[]> top = aiUsoRepository.findTopConsumoMes(anio, mes);
                List<Map<String, Object>> topList = new ArrayList<>();
                for (Object[] row : top) {
                    long te = ((Number) row[2]).longValue();
                    long ts = ((Number) row[3]).longValue();
                    double cEmp = (te / 1_000_000.0 * PRECIO_INPUT) + (ts / 1_000_000.0 * PRECIO_OUTPUT);
                    Map<String, Object> emp = new LinkedHashMap<>();
                    emp.put("empresa",       row[0]);
                    emp.put("llamadas",      ((Number) row[1]).longValue());
                    emp.put("tokens",        te + ts);
                    emp.put("costoUSD",      String.format("$%.4f", cEmp));
                    topList.add(emp);
                }
                ia.put("topEmpresas", topList);
            } catch (Exception e) {
                log.warn("[observabilidad] No se pudo calcular top empresas IA: {}", e.getMessage());
            }

            metrics.put("ia", ia);

            // ── Webhooks ──────────────────────────────────────────────────────
            Map<String, Object> webhooks = new LinkedHashMap<>();
            webhooks.put("pendientes", webhookEventRepository.countByProcesado(false));
            metrics.put("webhooks", webhooks);

            // ── Productos ─────────────────────────────────────────────────────
            Map<String, Object> productos = new LinkedHashMap<>();
            productos.put("total", productoRepository.count());
            metrics.put("productos", productos);

            // ── Base de datos (tamaño) ─────────────────────────────────────────
            try {
                String bdSize = jdbc.queryForObject(
                    "SELECT pg_size_pretty(pg_database_size(current_database()))", String.class);
                Long rawBytes = jdbc.queryForObject(
                    "SELECT pg_database_size(current_database())", Long.class);
                long bdSizeBytes = rawBytes != null ? rawBytes : 0L;
                Map<String, Object> bd = new LinkedHashMap<>();
                bd.put("tamano",      bdSize);
                bd.put("tamanoBytes", bdSizeBytes);
                metrics.put("baseDeDatos", bd);
            } catch (Exception e) {
                log.warn("[observabilidad] No se pudo obtener tamaño de BD: {}", e.getMessage());
                metrics.put("baseDeDatos", Map.of("tamano", "N/D"));
            }

            // ── Circuit Breakers ──────────────────────────────────────────────
            Map<String, Object> circuitBreakers = new LinkedHashMap<>();
            for (String cbName : List.of("stripe", "hacienda", "claude", "supabase")) {
                try {
                    var cb = circuitBreakerRegistry.circuitBreaker(cbName);
                    var m  = cb.getMetrics();
                    Map<String, Object> cbInfo = new LinkedHashMap<>();
                    cbInfo.put("estado",           cb.getState().toString());
                    cbInfo.put("tasaFallo",         String.format("%.1f", m.getFailureRate()));
                    cbInfo.put("llamadasExitosas",  m.getNumberOfSuccessfulCalls());
                    cbInfo.put("llamadasFallidas",  m.getNumberOfFailedCalls());
                    cbInfo.put("llamadasBuffered",  m.getNumberOfBufferedCalls());
                    circuitBreakers.put(cbName, cbInfo);
                } catch (Exception e) {
                    circuitBreakers.put(cbName, Map.of("estado", "NO_REGISTRADO"));
                }
            }
            metrics.put("circuitBreakers", circuitBreakers);

            // ── Caches (Caffeine stats) ───────────────────────────────────────
            if (cacheManager instanceof CaffeineCacheManager) {
                Map<String, Object> caches = new LinkedHashMap<>();
                for (String name : List.of("tenantInfo", "empresaFlags", "dashboard-metricas",
                                           "categorias-publicas", "marcas-publicas")) {
                    var springCache = cacheManager.getCache(name);
                    if (springCache instanceof CaffeineCache cc) {
                        var stats = cc.getNativeCache().stats();
                        caches.put(name, Map.of(
                            "hitRate",   String.format("%.1f%%", stats.hitRate() * 100),
                            "size",      cc.getNativeCache().estimatedSize(),
                            "evictions", stats.evictionCount()
                        ));
                    }
                }
                metrics.put("caches", caches);
            }

            // ── HikariCP pool ─────────────────────────────────────────────────
            if (dataSource instanceof HikariDataSource hds) {
                try {
                    var pool = hds.getHikariPoolMXBean();
                    Map<String, Object> hikari = new LinkedHashMap<>();
                    hikari.put("activas",   pool.getActiveConnections());
                    hikari.put("idle",      pool.getIdleConnections());
                    hikari.put("total",     pool.getTotalConnections());
                    hikari.put("esperando", pool.getThreadsAwaitingConnection());
                    hikari.put("alerta",    pool.getThreadsAwaitingConnection() > 0 ? "POOL_SATURADO" : "OK");
                    metrics.put("hikari", hikari);
                } catch (Exception e) {
                    log.warn("[observabilidad] HikariCP MXBean no disponible: {}", e.getMessage());
                }
            }

            // ── Timestamp ────────────────────────────────────────────────────
            metrics.put("generadoEn", LocalDateTime.now(Constants.ZONA_CR).toString());

            return ResponseEntity.ok(ResponseDTO.success("Métricas de plataforma", metrics));

        } catch (Exception e) {
            log.error("[observabilidad] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("Error al obtener métricas"));
        }
    }
}
