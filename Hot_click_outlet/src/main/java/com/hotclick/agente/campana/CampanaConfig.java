package com.hotclick.agente.campana;

import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Locale;

/**
 * Límites y precio de referencia de las campañas (AG-36). Todo se cambia por propiedad sin tocar código; los valores
 * por defecto son RECOMENDACIONES pendientes de que el dueño las confirme:
 * <ul>
 *   <li>{@code agente.campana.tope-contacto-semana}: máximo de campañas por contacto en 7 días (2).</li>
 *   <li>{@code agente.campana.tope-mensual.emprendedor|pyme|negocio-plus}: mensajes de marketing por negocio y mes.</li>
 *   <li>{@code agente.campana.costo-marketing-usd}: lo que Meta cobra al negocio por mensaje de marketing en Costa Rica
 *       (tarifa de la región "Rest of Latin America"). Es una estimación: confirmar en el tarifario vigente de Meta.</li>
 *   <li>{@code agente.campana.lote}: envíos por pasada del scheduler.</li>
 * </ul>
 */
@Component
public class CampanaConfig {

    private final int topeContactoSemana;
    private final int topeEmprendedor;
    private final int topePyme;
    private final int topeNegocioPlus;
    private final BigDecimal costoMarketingUsd;
    private final int lote;
    private final int maxIntentos;
    private final Clock reloj;

    @Autowired // con dos constructores Spring no elige solo
    public CampanaConfig(
            @Value("${agente.campana.tope-contacto-semana:2}") int topeContactoSemana,
            @Value("${agente.campana.tope-mensual.emprendedor:100}") int topeEmprendedor,
            @Value("${agente.campana.tope-mensual.pyme:500}") int topePyme,
            @Value("${agente.campana.tope-mensual.negocio-plus:2500}") int topeNegocioPlus,
            @Value("${agente.campana.costo-marketing-usd:0.074}") BigDecimal costoMarketingUsd,
            @Value("${agente.campana.lote:50}") int lote,
            @Value("${agente.campana.max-intentos:3}") int maxIntentos) {
        this(topeContactoSemana, topeEmprendedor, topePyme, topeNegocioPlus, costoMarketingUsd, lote, maxIntentos,
            Clock.system(Constants.ZONA_CR));
    }

    CampanaConfig(int topeContactoSemana, int topeEmprendedor, int topePyme, int topeNegocioPlus,
                  BigDecimal costoMarketingUsd, int lote, int maxIntentos, Clock reloj) {
        this.topeContactoSemana = Math.max(1, topeContactoSemana);
        this.topeEmprendedor = topeEmprendedor;
        this.topePyme = topePyme;
        this.topeNegocioPlus = topeNegocioPlus;
        this.costoMarketingUsd = costoMarketingUsd;
        this.lote = Math.max(1, lote);
        this.maxIntentos = Math.max(1, maxIntentos);
        this.reloj = reloj;
    }

    public int topeContactoSemana() { return topeContactoSemana; }

    public int lote() { return lote; }

    public int maxIntentos() { return maxIntentos; }

    public BigDecimal costoMarketingUsd() { return costoMarketingUsd; }

    /** Tope mensual de mensajes de marketing del negocio según su plan; un plan desconocido usa el más bajo. */
    public int topeMensual(String nombrePlan) {
        String n = nombrePlan == null ? "" : nombrePlan.trim().toUpperCase(Locale.ROOT);
        return switch (n) {
            case "PYME" -> topePyme;
            case "NEGOCIO_PLUS" -> topeNegocioPlus;
            default -> topeEmprendedor;
        };
    }

    /** Costo estimado que Meta cobrará al negocio por {@code mensajes} mensajes de marketing. */
    public BigDecimal costoEstimado(int mensajes) {
        return costoMarketingUsd.multiply(BigDecimal.valueOf(Math.max(0, mensajes)))
            .setScale(2, java.math.RoundingMode.HALF_UP);
    }

    public Instant ahora() { return Instant.now(reloj); }

    /** Inicio del mes calendario actual en Costa Rica. */
    public Instant inicioDeMes() {
        ZonedDateTime z = ZonedDateTime.now(reloj).withDayOfMonth(1).toLocalDate().atStartOfDay(Constants.ZONA_CR);
        return z.toInstant();
    }

    public Instant haceUnaSemana() { return ahora().minus(java.time.Duration.ofDays(7)); }

    public Clock reloj() { return reloj; }
}
