package com.hotclick.agente.cupo;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.spi.ControlCupoConversacion;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.tenant.TenantInfoBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cupo de conversaciones por plan y tope de gasto de IA por negocio (AG-29). Decide ANTES de llamar a Claude:
 * el primer mensaje de un cliente en el mes consume 1 conversación; si el negocio pasó su cupo, o su gasto de IA del
 * mes llegó al tope, el bot no responde y la conversación pasa a PERSONA con la marca de cupo agotado.
 *
 * <p>Solo aplica al bot de ventas de un negocio ({@code NEGOCIO_VENTAS} con empresa): la cuenta de HotClick
 * (empresa null) y el modo interno no tienen cupo. Un plan sin la función {@code agente} no tiene bot. Ante un error
 * de base de datos el bot no responde (falla cerrado) pero la conversación sigue visible en la bandeja.
 */
@Service
public class AgenteCupoService implements ControlCupoConversacion {

    private static final Logger log = LoggerFactory.getLogger(AgenteCupoService.class);

    public enum Motivo { PLAN_SIN_AGENTE, CUPO, TOPE_GASTO }

    /** Resumen del mes para el panel. {@code cupo}: -1 ilimitado, null sin cupo (HotClick). */
    public record Resumen(LocalDate mes, int conversaciones, Integer cupo, BigDecimal costoUsd, BigDecimal topeUsd,
                          boolean agenteIncluido) { }

    private final EmpresaRepository empresas;
    private final AgenteUsoRepositorio uso;
    private final ConversacionService conversaciones;
    private final HasherInterno hasher;
    private final TenantInfoBuilder planes;
    private final AgenteCupoConfig config;

    public AgenteCupoService(EmpresaRepository empresas, AgenteUsoRepositorio uso, ConversacionService conversaciones,
                             HasherInterno hasher, TenantInfoBuilder planes, AgenteCupoConfig config) {
        this.empresas = empresas;
        this.uso = uso;
        this.conversaciones = conversaciones;
        this.hasher = hasher;
        this.planes = planes;
        this.config = config;
    }

    @Override
    public boolean permitir(ConversacionActiva conv) {
        if (conv.empresaId() == null || conv.perfil() != PerfilConversacion.NEGOCIO_VENTAS) return true;
        try {
            Motivo bloqueo = evaluar(conv);
            if (bloqueo == null) return true;
            conversaciones.pausarPorCupo(conv.sesionId(), conv.empresaId());
            log.info("[agente-cupo] bot detenido empresa={} motivo={}", conv.empresaId(), bloqueo);
            return false;
        } catch (RuntimeException e) {
            // Sin mensaje: puede traer SQL o datos del cliente.
            log.warn("[agente-cupo] no se pudo evaluar el cupo empresa={}: {}", conv.empresaId(), e.getClass().getSimpleName());
            return false;
        }
    }

    /** @return el motivo del bloqueo, o null si el bot puede responder (y la conversación quedó contada). */
    Motivo evaluar(ConversacionActiva conv) {
        Long empresaId = conv.empresaId();
        Empresa empresa = empresas.findByIdWithPlan(empresaId).orElse(null);
        Plan plan = empresa == null ? null : empresa.getPlan();
        if (plan == null || !planes.planTiene(plan, "agente")) return Motivo.PLAN_SIN_AGENTE;

        LocalDate mes = config.mesActual();
        BigDecimal tope = config.topeUsd(plan.getNombre());
        if (uso.leer(empresaId, mes).costoUsd().compareTo(tope) >= 0) return Motivo.TOPE_GASTO;

        int max = plan.getMaxConversacionesAgente() == null ? 0 : plan.getMaxConversacionesAgente();
        int cupo = max < 0 ? Integer.MAX_VALUE : max;
        String hash = hasher.contacto(empresaId, conv.cuenta().getTipo().name(), conv.contacto());
        AgenteUsoRepositorio.Conteo conteo = uso.contarConversacion(empresaId, mes, hash, cupo);
        return conteo == AgenteUsoRepositorio.Conteo.SIN_CUPO ? Motivo.CUPO : null;
    }

    /** Uso del mes de un negocio (empresaId null = HotClick, sin cupo ni tope). */
    public Resumen resumen(Long empresaId) {
        LocalDate mes = config.mesActual();
        AgenteUsoRepositorio.Uso u = uso.leer(empresaId, mes);
        if (empresaId == null) return new Resumen(mes, u.conversaciones(), null, u.costoUsd(), null, true);
        Empresa empresa = empresas.findByIdWithPlan(empresaId).orElse(null);
        Plan plan = empresa == null ? null : empresa.getPlan();
        boolean incluido = plan != null && planes.planTiene(plan, "agente");
        Integer cupo = plan == null || plan.getMaxConversacionesAgente() == null ? 0 : plan.getMaxConversacionesAgente();
        BigDecimal tope = config.topeUsd(plan == null ? null : plan.getNombre());
        return new Resumen(mes, u.conversaciones(), incluido ? cupo : 0, u.costoUsd(), tope, incluido);
    }
}
