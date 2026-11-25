package com.hotclick.agente.cupo;

import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Locale;

/**
 * Tope de gasto de IA por negocio y mes, por plan. Valores en USD y recomendados, pendientes de que el dueño los
 * confirme; se cambian por propiedad sin tocar código: {@code agente.tope-usd.emprendedor|pyme|negocio-plus}.
 * Un plan desconocido se trata como Emprendedor (el más bajo). Un tope en 0 o negativo bloquea al bot de inmediato.
 */
@Component
public class AgenteCupoConfig {

    private final BigDecimal emprendedor;
    private final BigDecimal pyme;
    private final BigDecimal negocioPlus;
    private final Clock reloj;

    @Autowired
    public AgenteCupoConfig(
            @Value("${agente.tope-usd.emprendedor:3.00}") BigDecimal emprendedor,
            @Value("${agente.tope-usd.pyme:10.00}") BigDecimal pyme,
            @Value("${agente.tope-usd.negocio-plus:30.00}") BigDecimal negocioPlus) {
        this(emprendedor, pyme, negocioPlus, Clock.system(Constants.ZONA_CR));
    }

    AgenteCupoConfig(BigDecimal emprendedor, BigDecimal pyme, BigDecimal negocioPlus, Clock reloj) {
        this.emprendedor = emprendedor;
        this.pyme = pyme;
        this.negocioPlus = negocioPlus;
        this.reloj = reloj;
    }

    public BigDecimal topeUsd(String nombrePlan) {
        String n = nombrePlan == null ? "" : nombrePlan.trim().toUpperCase(Locale.ROOT);
        return switch (n) {
            case "PYME" -> pyme;
            case "NEGOCIO_PLUS" -> negocioPlus;
            default -> emprendedor;
        };
    }

    /** Primer día del mes actual en Costa Rica: la llave del mes en las tablas de uso. */
    public LocalDate mesActual() {
        return LocalDate.now(reloj).withDayOfMonth(1);
    }

    public Clock reloj() {
        return reloj;
    }
}
