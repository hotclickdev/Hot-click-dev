package com.hotclick.controller.observabilidad;

import com.hotclick.repository.AiUsoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Métricas de negocio del dashboard de observabilidad.
 * Extraído bit-idéntico de ObservabilityMetricsHandler — no cambia comportamiento.
 */
@Component
class ObservabilityNegocioMetrics {

    private static final Logger log = LoggerFactory.getLogger(ObservabilityNegocioMetrics.class);

    @Autowired private EmpresaRepository          empresaRepository;
    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private PagoRepository             pagoRepository;
    @Autowired private UsuarioRepository          usuarioRepository;
    @Autowired private SecurityAuditLogRepository auditLogRepository;
    @Autowired private SecurityAlertRepository    alertRepository;
    @Autowired private AiUsoRepository            aiUsoRepository;
    @Autowired private WebhookEventRepository     webhookEventRepository;
    @Autowired private ProductoRepository         productoRepository;

    Map<String, Object> empresas() {
        Map<String, Object> empresas = new LinkedHashMap<>();
        empresas.put("activas",  empresaRepository.countByEstadoEmpresa("ACTIVO"));
        empresas.put("trial",    empresaRepository.countByEstadoEmpresa("TRIAL"));
        empresas.put("vencidas", empresaRepository.countByEstadoEmpresa("VENCIDO"));
        empresas.put("total",    empresaRepository.count());
        return empresas;
    }

    Map<String, Object> pedidos() {
        Map<String, Object> pedidos = new LinkedHashMap<>();
        pedidos.put("pendientes",    pedidoRepository.countByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, 1));
        pedidos.put("enPreparacion", pedidoRepository.countByEstadoPedidoAndEstado("EN_PREPARACION", 1));
        pedidos.put("enviados",      pedidoRepository.countByEstadoPedidoAndEstado("ENVIADO", 1));
        pedidos.put("total",         pedidoRepository.countTotalPedidos());
        return pedidos;
    }

    Map<String, Object> pagos() {
        Map<String, Object> pagos = new LinkedHashMap<>();
        pagos.put("capturados", pagoRepository.countByEstadoPago("CAPTURADO"));
        pagos.put("pendientes", pagoRepository.countByEstadoPago("PENDIENTE"));
        pagos.put("fallidos",   pagoRepository.countByEstadoPago("FALLIDO"));
        return pagos;
    }

    Map<String, Object> usuarios() {
        Map<String, Object> usuarios = new LinkedHashMap<>();
        usuarios.put("activos",   usuarioRepository.countUsuariosActivos());
        usuarios.put("pendientes",usuarioRepository.countUsuariosPendientes());
        return usuarios;
    }

    Map<String, Object> seguridad() {
        LocalDateTime hace24h = LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
        Map<String, Object> seguridad = new LinkedHashMap<>();
        seguridad.put("eventosTotal24h",    auditLogRepository.countByTimestampAfter(hace24h));
        seguridad.put("eventosCriticos24h", auditLogRepository.countBySeverityAndTimestampAfter("CRITICAL", hace24h));
        seguridad.put("intentosLogin24h",   auditLogRepository.countByEventTypeAndTimestampAfter("LOGIN_FAILED", hace24h));
        seguridad.put("rateLimitHits24h",   auditLogRepository.countByEventTypeAndTimestampAfter("RATE_LIMIT_TRIGGERED", hace24h));
        seguridad.put("alertasAbiertas",    alertRepository.countByResolvedFalse());
        seguridad.put("alertasCriticas",    alertRepository.countBySeverityAndResolvedFalse("CRITICAL"));
        return seguridad;
    }

    Map<String, Object> ia() {
        int anio = LocalDate.now(Constants.ZONA_CR).getYear();
        int mes  = LocalDate.now(Constants.ZONA_CR).getMonthValue();
        Map<String, Object> ia = new LinkedHashMap<>();
        // Claude Haiku 3.5: $0.80/M input · $4.00/M output (https://www.anthropic.com/pricing)
        final double PRECIO_INPUT  = 0.80;
        final double PRECIO_OUTPUT = 4.00;

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

        int diaActual = LocalDate.now(Constants.ZONA_CR).getDayOfMonth();
        double costoDiario = diaActual > 0 ? costoMes / diaActual : 0;
        ia.put("costoDiarioPromedioUSD", String.format("$%.4f", costoDiario));

        agregarCostoAcumulado(ia, PRECIO_INPUT, PRECIO_OUTPUT);
        agregarTopEmpresas(ia, anio, mes, PRECIO_INPUT, PRECIO_OUTPUT);
        return ia;
    }

    Map<String, Object> webhooks() {
        Map<String, Object> webhooks = new LinkedHashMap<>();
        webhooks.put("pendientes", webhookEventRepository.countByProcesado(false));
        return webhooks;
    }

    Map<String, Object> productos() {
        Map<String, Object> productos = new LinkedHashMap<>();
        productos.put("total", productoRepository.count());
        return productos;
    }

    private void agregarCostoAcumulado(Map<String, Object> ia, double precioInput, double precioOutput) {
        try {
            long acumEntrada = aiUsoRepository.sumTokensEntradaAcumulados();
            long acumSalida  = aiUsoRepository.sumTokensSalidaAcumulados();
            double costoAcum = (acumEntrada / 1_000_000.0 * precioInput)
                             + (acumSalida  / 1_000_000.0 * precioOutput);
            ia.put("costoAcumuladoUSD",    String.format("$%.2f", costoAcum));
            ia.put("tokensAcumulados",      acumEntrada + acumSalida);
        } catch (Exception e) {
            log.warn("[observabilidad] No se pudo calcular costo acumulado IA: {}", e.getMessage());
        }
    }

    private void agregarTopEmpresas(Map<String, Object> ia, int anio, int mes,
                                    double precioInput, double precioOutput) {
        try {
            List<Object[]> top = aiUsoRepository.findTopConsumoMes(anio, mes);
            List<Map<String, Object>> topList = new ArrayList<>();
            for (Object[] row : top) {
                long te = ((Number) row[2]).longValue();
                long ts = ((Number) row[3]).longValue();
                double cEmp = (te / 1_000_000.0 * precioInput) + (ts / 1_000_000.0 * precioOutput);
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
    }
}
