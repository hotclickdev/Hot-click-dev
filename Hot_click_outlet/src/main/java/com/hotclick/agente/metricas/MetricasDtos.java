package com.hotclick.agente.metricas;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Vistas públicas de las métricas del bot (AG-32). Solo cifras agregadas: ningún dato de clientes. */
public final class MetricasDtos {

    private MetricasDtos() { }

    /** Conversaciones (con bot) → enlaces creados → abiertos → pagados. */
    public record Embudo(long conversaciones, long enlacesCreados, long enlacesAbiertos, long enlacesPagados) { }

    /**
     * Una fila por bot (perfil) o por canal. {@code conversionPct} = enlaces pagados / conversaciones, con un
     * decimal; 0 si no hubo conversaciones.
     */
    public record Segmento(String clave, long conversaciones, long enlacesCreados, long enlacesPagados,
                           double conversionPct) { }

    /** Ventas atribuidas al bot (pedidos con {@code origen_canal}) ya pagadas. Montos en colones enteros. */
    public record Ventas(long cantidad, long totalColones, List<VentaCanal> porCanal) { }

    public record VentaCanal(String canal, long cantidad, long totalColones) { }

    /** Enlaces que vencieron sin pagar: la venta perdida por no cerrar a tiempo. */
    public record Perdidas(long cantidad, long totalColones) { }

    /**
     * Costo de IA del rango (se registra por mes: se suman los meses que tocan el rango) y costo por venta.
     * {@code costoPorVentaUsd} es null si no hubo ventas.
     */
    public record Costos(BigDecimal costoUsd, BigDecimal costoPorVentaUsd, long conversacionesCobradas) { }

    public record Metricas(Embudo embudo, List<Segmento> porBot, List<Segmento> porCanal, Ventas ventas,
                           long traspasosAPersona, Perdidas perdidas, Costos costos) { }

    /** Aviso de Meta sobre la cuenta o la calidad del número (solo ADMIN). */
    public record AlertaMeta(String campo, String evento, String limite, Instant creadoEn) { }

    /**
     * @param alcance    NEGOCIO (el negocio del llamador) o HOTCLICK (el ADMIN: el bot de HotClick)
     * @param plataforma total de todos los bots; solo lo ve el ADMIN (null para un negocio)
     * @param alertasMeta últimos avisos de Meta; solo lo ve el ADMIN (null para un negocio)
     */
    public record Respuesta(LocalDate desde, LocalDate hasta, String alcance, Metricas propias, Metricas plataforma,
                            List<AlertaMeta> alertasMeta) { }
}
