package com.hotclick.service.shoppingassistant;

import com.hotclick.security.RateLimiter;
import com.hotclick.service.AiQuotaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * ALTO-1 (auditoría chatbots): tope de costo del asistente público ANTES de llamar al LLM.
 *
 * <ol>
 *   <li>Tope global diario (todas las tiendas) — corta la factura ante abuso distribuido.</li>
 *   <li>Límite diario por tienda — un tenant no puede agotar el presupuesto global.</li>
 *   <li>Cuota del plan ({@link AiQuotaService#verificarYReservar}) — sólo tiendas de tenant;
 *       el marketplace HotClick es costo de plataforma y lo cubren los dos topes anteriores.</li>
 * </ol>
 * Reusa {@link RateLimiter} (contador en BD, compartido entre instancias).
 * Fail-closed: cualquier error al verificar se trata como "sin cupo".
 */
@Component
public class ShoppingAssistantCuota {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantCuota.class);
    static final int DIA_SEGUNDOS = 86_400;

    static final String RESPUESTA_AGOTADA =
        "Nuestro asistente está atendiendo muchas consultas en este momento. " +
        "Podés seguir explorando el catálogo y volver a intentarlo más tarde.";

    private final RateLimiter rateLimiter;
    private final AiQuotaService aiQuotaService;
    private final int maxPorTiendaDia;
    private final int maxGlobalDia;

    public ShoppingAssistantCuota(RateLimiter rateLimiter, AiQuotaService aiQuotaService,
                                  @Value("${asistente.cuota.por-tienda-dia:300}") int maxPorTiendaDia,
                                  @Value("${asistente.cuota.global-dia:3000}") int maxGlobalDia) {
        this.rateLimiter = rateLimiter;
        this.aiQuotaService = aiQuotaService;
        this.maxPorTiendaDia = Math.max(0, maxPorTiendaDia);
        this.maxGlobalDia = Math.max(0, maxGlobalDia);
    }

    /** true si hay cupo y quedó reservado; false → responder degradado sin llamar al LLM. */
    public boolean reservar(Long empresaId, boolean marketplace) {
        try {
            if (!rateLimiter.tryAcquire("asistente:global", maxGlobalDia, DIA_SEGUNDOS)) {
                log.warn("[asistente-cuota] Tope GLOBAL diario alcanzado ({}). Revisar abuso/costo.", maxGlobalDia);
                return false;
            }
            if (!rateLimiter.tryAcquire("asistente:empresa:" + empresaId, maxPorTiendaDia, DIA_SEGUNDOS)) {
                log.warn("[asistente-cuota] Límite diario por tienda alcanzado empresa={} ({})", empresaId, maxPorTiendaDia);
                return false;
            }
            if (!marketplace && !aiQuotaService.verificarYReservar(empresaId)) {
                log.info("[asistente-cuota] Cuota de plan agotada empresa={}", empresaId);
                return false;
            }
            return true;
        } catch (RuntimeException e) {
            log.warn("[asistente-cuota] Error verificando cuota empresa={} → fail-closed: {}",
                empresaId, e.getClass().getSimpleName());
            return false;
        }
    }
}
