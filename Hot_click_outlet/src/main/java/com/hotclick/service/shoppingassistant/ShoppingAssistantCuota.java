package com.hotclick.service.shoppingassistant;

import com.hotclick.service.AiQuotaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * ALTO-1 (auditoría chatbots): tope de costo del asistente público ANTES de llamar al LLM
 * (chat y búsqueda por imagen).
 *
 * <ol>
 *   <li>Límite diario por tienda — un tenant no puede agotar el presupuesto global.</li>
 *   <li>Tope global diario (todas las tiendas). Si rechaza, se devuelve el cupo de la tienda.</li>
 *   <li>Cuota del plan ({@link AiQuotaService#verificarYReservar}) — sólo tiendas de tenant.
 *       Si rechaza, se devuelven los dos cupos anteriores.</li>
 * </ol>
 *
 * <p>Contador ESTRICTO propio sobre {@code hot_click_rate_limit_tb}: a diferencia de
 * {@code RateLimiter.tryAcquire} (fail-open ante errores de BD), aquí cualquier error niega.
 * El reinicio de ventana y el incremento van en un único UPDATE atómico.
 */
@Component
public class ShoppingAssistantCuota {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantCuota.class);
    static final int DIA_SEGUNDOS = 86_400;
    static final String CLAVE_GLOBAL = "asistente:global";

    public static final String RESPUESTA_AGOTADA =
        "Nuestro asistente está atendiendo muchas consultas en este momento. " +
        "Podés seguir explorando el catálogo y volver a intentarlo más tarde.";

    private static final String UPSERT_ATOMICO = """
        UPDATE hot_click_rate_limit_tb
           SET count        = CASE WHEN window_start + ? <= ? THEN 1 ELSE count + 1 END,
               window_start = CASE WHEN window_start + ? <= ? THEN ? ELSE window_start END,
               expires_at   = CASE WHEN window_start + ? <= ? THEN ? ELSE expires_at END
         WHERE bucket_key = ?
        """;
    private static final String INSERT =
        "INSERT INTO hot_click_rate_limit_tb (bucket_key, count, window_start, expires_at) VALUES (?, 1, ?, ?)";
    private static final String COUNT =
        "SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = ?";
    private static final String DEVOLVER =
        "UPDATE hot_click_rate_limit_tb SET count = count - 1 WHERE bucket_key = ? AND count > 0";

    private final JdbcTemplate jdbc;
    private final AiQuotaService aiQuotaService;
    private final int maxPorTiendaDia;
    private final int maxGlobalDia;

    public ShoppingAssistantCuota(JdbcTemplate jdbc, AiQuotaService aiQuotaService,
                                  @Value("${asistente.cuota.por-tienda-dia:300}") int maxPorTiendaDia,
                                  @Value("${asistente.cuota.global-dia:3000}") int maxGlobalDia) {
        this.jdbc = jdbc;
        this.aiQuotaService = aiQuotaService;
        this.maxPorTiendaDia = Math.max(0, maxPorTiendaDia);
        this.maxGlobalDia = Math.max(0, maxGlobalDia);
    }

    static String claveTienda(Long empresaId) {
        return "asistente:empresa:" + (empresaId == null ? "marketplace" : empresaId);
    }

    /** true si hay cupo y quedó reservado; false → responder degradado sin llamar a IA. */
    public boolean reservar(Long empresaId, boolean marketplace) {
        String tienda = claveTienda(empresaId);
        boolean tiendaTomada = false;
        boolean globalTomado = false;
        try {
            int enTienda = incrementarEstricto(tienda);
            tiendaTomada = true;
            if (enTienda > maxPorTiendaDia) {
                log.warn("[asistente-cuota] Límite diario por tienda alcanzado empresa={} ({})", empresaId, maxPorTiendaDia);
                devolver(tienda);
                return false;
            }
            int enGlobal = incrementarEstricto(CLAVE_GLOBAL);
            globalTomado = true;
            if (enGlobal > maxGlobalDia) {
                log.warn("[asistente-cuota] Tope GLOBAL diario alcanzado ({}). Revisar abuso/costo.", maxGlobalDia);
                devolver(CLAVE_GLOBAL);
                devolver(tienda);
                return false;
            }
            if (!marketplace && (empresaId == null || !aiQuotaService.verificarYReservar(empresaId))) {
                log.info("[asistente-cuota] Cuota de plan agotada empresa={}", empresaId);
                devolver(CLAVE_GLOBAL);
                devolver(tienda);
                return false;
            }
            return true;
        } catch (RuntimeException e) {
            log.warn("[asistente-cuota] Error verificando cuota empresa={} → fail-closed: {}",
                empresaId, e.getClass().getName());
            if (globalTomado) devolver(CLAVE_GLOBAL);
            if (tiendaTomada) devolver(tienda);
            return false;
        }
    }

    /** Incrementa (reiniciando la ventana si venció) y devuelve el conteo. Propaga cualquier error. */
    int incrementarEstricto(String clave) {
        long ahora = Instant.now().getEpochSecond();
        long vence = ahora + DIA_SEGUNDOS;
        if (actualizar(clave, ahora, vence) == 0) {
            try {
                jdbc.update(INSERT, clave, ahora, vence);
                return 1;
            } catch (DataIntegrityViolationException carrera) {
                if (actualizar(clave, ahora, vence) == 0) throw carrera;
            }
        }
        List<Integer> c = jdbc.queryForList(COUNT, Integer.class, clave);
        if (c.isEmpty() || c.get(0) == null) throw new IllegalStateException("contador ausente");
        return c.get(0);
    }

    private int actualizar(String clave, long ahora, long vence) {
        return jdbc.update(UPSERT_ATOMICO,
            DIA_SEGUNDOS, ahora, DIA_SEGUNDOS, ahora, ahora, DIA_SEGUNDOS, ahora, vence, clave);
    }

    private void devolver(String clave) {
        try {
            jdbc.update(DEVOLVER, clave);
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] No se pudo devolver cupo {}: {}", clave, e.getClass().getName());
        }
    }
}
